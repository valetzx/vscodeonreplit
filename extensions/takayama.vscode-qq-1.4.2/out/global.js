"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseContactId = exports.genContactId = exports.NOOP = exports.setClient = exports.setContext = exports.client = exports.ctx = void 0;
function genContactId(type, uin) {
    return client.uin + type + uin;
}
exports.genContactId = genContactId;
function parseContactId(id) {
    let type;
    if (id.includes("u")) {
        type = "u";
    }
    else {
        type = "g";
    }
    let self = parseInt(id.split(type)[0]);
    let uin = parseInt(id.split(type)[1]);
    return { self, type, uin };
}
exports.parseContactId = parseContactId;
function setContext(context) {
    exports.ctx = ctx = context;
}
exports.setContext = setContext;
function setClient(c) {
    exports.client = client = c;
}
exports.setClient = setClient;
let ctx;
exports.ctx = ctx;
let client;
exports.client = client;
const NOOP = () => { };
exports.NOOP = NOOP;
//# sourceMappingURL=global.js.map