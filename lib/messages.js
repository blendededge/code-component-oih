const uuid = require('uuid');

exports.newEmptyMessage = newEmptyMessage;
exports.newMessageWithData = newMessageWithData;
exports.emitData = emitData;
exports.emitError = emitError;
exports.emitEnd = emitEnd;
exports.emitSnapshot = emitSnapshot;

function newEmptyMessage() {

    const msg = {
        id: uuid.v4(),
        attachments: {},
        data: {},
        headers: {},
        metadata: {}
    };

    return msg;
}

function newMessageWithData(data) {

    const msg = newEmptyMessage();

    msg.data = data;

    return msg;
}

function emitData(data) {
    this.emit('data', exports.newMessageWithData(data));
}

function emitError(err) {
    this.emit('error', err);
}

function emitEnd() {
    this.emit('end');
}

function emitSnapshot(snapshot) {
    this.emit('snapshot', snapshot);
}
