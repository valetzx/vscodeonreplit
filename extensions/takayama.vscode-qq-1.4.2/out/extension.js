"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const global = require("./global");
const client = require("./client");
let timer;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // create work dir
    global.setContext(context);
    if (!fs.existsSync(context.globalStoragePath)) {
        fs.mkdirSync(context.globalStoragePath);
    }
    if (!timer) {
        timer = setInterval(() => {
            var _a;
            if ((_a = global.client) === null || _a === void 0 ? void 0 : _a.isOnline()) {
                fs.writeFile(path.join(global.client.dir, "online.lock"), "114514", () => { });
            }
        }, 5000);
    }
    // creat status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "QQ";
    statusBarItem.command = "oicq.statusBar.click";
    statusBarItem.show();
    vscode.commands.registerCommand("oicq.statusBar.click", client.invoke);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map