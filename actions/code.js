// eslint-disable-next-line import/no-extraneous-dependencies
const _ = require('lodash');
const vm = require('vm');
const co = require('co');
const request = require('co-request');
const moment = require('moment');
const crypto = require('crypto-js');
const { wrapper } = require('@blendededge/ferryman-extensions');
const messages = require('../lib/messages');

function wait(timeout) {
  return new Promise((ok) => {
    setTimeout(() => {
      this.logger.debug('Done wait');
      ok();
    }, timeout);
    this.logger.debug('Start wait sec=%s', timeout);
  });
}

// eslint-disable-next-line consistent-return,func-names
exports.process = async function (msg, conf, snapshot, msgHeaders, tokenData) {
  let emitter;
  try {
    emitter = await wrapper(this, msg, conf, snapshot, msgHeaders, tokenData);
    const vmExports = {};
    const ctx = vm.createContext({
      // Node Globals
      Buffer,
      clearInterval,
      clearTimeout,
      console,
      exports: vmExports,
      global: {},
      module: { exports: vmExports },
      process,
      require,
      setInterval,
      setTimeout,
      URL,
      URLSearchParams,

      // EIO Specific Functionality
      emitter,
      messages,
      msg,

      // Other Libraries
      _,
      request,
      wait: wait.bind(this),
      moment,
      crypto,
    });
    this.logger.debug('Running the code %s', conf.code);
    vm.runInContext(conf.code, ctx, {
      displayErrors: true,
    });
    this.logger.debug("No result, let's check the run object if it was created?");
    if (ctx.run && typeof ctx.run.apply === 'function') {
      let result;
      if (ctx.run.constructor.name === 'GeneratorFunction') {
        this.logger.debug('Run variable is a generator');
        const fn = co.wrap(ctx.run);
        result = fn.apply(emitter, [msg, conf, snapshot]);
      } else {
        this.logger.debug('Run variable is a function, calling it');
        result = ctx.run.apply(emitter, [msg, conf, snapshot]);
      }
      if (typeof result === 'object' && typeof result.then === 'function') {
        this.logger.debug('Returned value is a promise, will evaluate it');
        let returnResult;
        try {
          returnResult = await result;
          this.logger.debug('Promise resolved');
          if (returnResult) {
            return messages.newMessageWithData(returnResult);
          }
          emitter.emit('end');
        } catch (e) {
          this.logger.error('Promise failed', e);
          throw e;
        }
      } else {
        emitter.emit('end');
      }
    } else {
      this.logger.debug("Run function was not found, it's over now");
      emitter.emit('end');
    }
  } catch (e) {
    if (emitter) {
      emitter.emit('error', e);
      emitter.logger.error('Error in code component', e);
    } else {
      this.emit('error', e);
      this.logger.error('Error in code component', e);
    }
  }
};
