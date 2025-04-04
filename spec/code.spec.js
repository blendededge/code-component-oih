/* eslint-disable max-len */
const chai = require('chai');
const sinon = require('sinon');
const action = require('../actions/code');

const { expect } = chai;

let emitter;
let self;
let code;

describe('code test', () => {
  beforeEach(() => {
    sinon.restore();
    emitter = {
      emit: sinon.spy(),
    };
    self = {
      logger: {
        debug: () => {},
        error: () => {},
        info: () => {},
        child: () => self.logger,
      },
      emit: emitter.emit,
    };
  });

  describe('when code is async function', () => {
    it('should succeed', async () => {
      code = 'async function run(msg, cfg, snapshot) {\n'
                    + '\tthis.logger.info(\'Incoming message is %s\', JSON.stringify(msg));\n'
                    + '\tconst data = { msg, cfg, snapshot };\n'
                    + '\tawait new Promise(resolve => setTimeout(resolve, 1000))\n'
                    + '\tawait this.emit(\'data\', { data });\n'
                    + '\tthis.logger.info(\'Execution finished\');\n'
                    + '}';
      const msg = {
        data: {
          my: 'data',
        },
        metadata: {},
      };
      const cfg = { code };
      const snapshot = {
        my: 'snapshot',
      };
      await action.process.call(self, msg, cfg, snapshot);
      const result = emitter.emit.getCall(0).args[1];
      expect(result.data).deep.equal({
        msg,
        cfg,
        snapshot,
      });
    });
  });

  describe('when code is a generator function', () => {
    it('should succeed', async () => {
      code = 'function* run(msg, cfg, snapshot) {\n'
        + '\tthis.logger.info(\'Incoming message is %s\', JSON.stringify(msg));\n'
        + '\tconst data = { msg, cfg, snapshot };\n'
        + '\tnew Promise(resolve => setTimeout(resolve, 1000))\n'
        + '\tthis.emit(\'data\', { data });\n'
        + '\tthis.logger.info(\'Execution finished\');\n'
        + '}';
      const msg = {
        data: {
          my: 'data',
        },
        metadata: {},
      };
      const cfg = { code };
      const snapshot = {
        my: 'snapshot',
      };
      await action.process.call(self, msg, cfg, snapshot);
      const result = emitter.emit.getCall(0).args[1];
      expect(result.data).deep.equal({
        msg,
        cfg,
        snapshot,
      });
    });
  });

  describe('ES5 code block', () => {
    it('Processes hello code normally', async () => {
      code = "console.log('Hello code!');";
      await action.process.call(self, { metadata: {} }, { code });
      expect(emitter.emit.calledOnce).equal(true);
      expect(emitter.emit.calledWith('end')).equal(true);
    });

    it('Processes hello code with run function', async () => {
      code = "function run(msg) { console.log('Hello code!'); this.emit('end');}";
      await action.process.call(self, { metadata: {} }, { code });
      expect(emitter.emit.calledWith('end')).equal(true);
    });

    it('Processes hello code emitting', async () => {
      code = 'function run(message) {'
          + "this.emit('data', messages.newMessageWithData({message: 'hello world'}));"
          + '}';
      await action.process.call(self, { metadata: {} }, { code });
      const result = emitter.emit.getCall(0).args[1];
      expect(result.data.message).equal('hello world');
    });

    it('simple script emitting data', async () => {
      code = "emitter.emit('data', messages.newMessageWithData({message: 'hello world'}));"
          + "emitter.emit('end'); ";
      await action.process.call(self, { metadata: {} }, { code });
      const result = emitter.emit.getCall(0).args[1];
      expect(result.data.message).equal('hello world');
    });
  });

  describe('ES6 Code Block with promises', () => {
    it('Promise that resolves', async () => {
      code = 'function run(message) {'
          + 'return new Promise(function(resolve, reject) {'
          + 'resolve(true);'
          + '})'
          + '};';
      const result = await action.process.call(self, { metadata: {} }, { code });
      expect(result.data).equal(true);
    });

    it('Promise that resolves 2', async () => {
      code = "function run(message) { console.log('Hello promise!'); return new Promise(function(accept, reject) { accept('Hello code!'); }); }";
      const result = await action.process.call(self, { metadata: {} }, { code });
      expect(result.data).equal('Hello code!');
    });
  });

  describe('ES6 Code Block with generator', () => {
    it('Simple generator', async () => {
      code = "function* run(message) { console.log('Hello generator!'); }";
      await action.process.call(self, { metadata: {} }, { code });
      expect(emitter.emit.calledOnce).equal(true);
    });

    it('Simple generator returning data', async () => {
      code = "function* run(message) { console.log('Hello generator!'); return 'Resolved!'; }";
      const result = await action.process.call(self, { metadata: {} }, { code });
      expect(result.data).equal('Resolved!');
    });

    it('Simple generator returning data with wait', async () => {
      code = "function* run(message) { console.log('Hello generator!'); yield wait(500); return 'Resolved!'; }";
      const result = await action.process.call(self, { metadata: {} }, { code });
      expect(result.data).equal('Resolved!');
    });

    it('Simple generator returning data from URL', async () => {
      code = "function* run(message) { console.log('Hello async request!'); var result = yield request.get('http://www.google.com'); return result.statusCode; }";
      const result = await action.process.call(self, { metadata: {} }, { code });
      expect(result.data).equal(200);
    });

    it('Validate Node Globals are available', async () => {
      code = `
        async function run(msg, cfg, snapshot) {
          console.log('Hello code, incoming message is msg=%j', msg);
          let s = "abc";
          let buff = Buffer.from(s);
          let base64data = buff.toString('base64');
          // Create message to be emitted
          var data = messages.newMessageWithData({message: base64data});
          // Emit the data event
          emitter.emit('data', data);
          // No need to emit end
          console.log('Finished execution');
        }
    `;

      await action.process.call(self, { data: {}, metadata: {} }, { code }, {});
      const result = emitter.emit.getCall(0).args[1];
      expect(result.data).deep.equal({ message: 'YWJj' });
    });
  });
});
