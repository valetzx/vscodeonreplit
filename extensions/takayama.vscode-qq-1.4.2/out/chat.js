"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bind = void 0;
const vscode = require("vscode");
const explorer_1 = require("./explorer");
const config_1 = require("./config");
const global_1 = require("./global");
vscode.commands.registerCommand("oicq.c2c.open", openChatView);
vscode.commands.registerCommand("oicq.group.open", openChatView);
const webviewMap = new Map;
const availableThemes = [
    "default",
    "console"
];
const T = Date.now();
function getHtml(id, webview) {
    let preload = webview.asWebviewUri(vscode.Uri.joinPath(global_1.ctx.extensionUri, "assets", "preload.js")).toString();
    let css, js;
    const config = config_1.getConfig();
    if (config.theme_css && config.theme_js) {
        if (config.theme_css.startsWith("http")) {
            css = config.theme_css;
        }
        else {
            css = webview.asWebviewUri(vscode.Uri.file(config.theme_css)).toString();
        }
        if (config.theme_js.startsWith("http")) {
            js = config.theme_js;
        }
        else {
            js = webview.asWebviewUri(vscode.Uri.file(config.theme_js)).toString();
        }
    }
    else {
        let theme = "default";
        if (availableThemes.includes(String(config.theme))) {
            theme = String(config.theme);
        }
        css = webview.asWebviewUri(vscode.Uri.joinPath(global_1.ctx.extensionUri, "assets", theme + "-theme", "style.css")).toString();
        js = webview.asWebviewUri(vscode.Uri.joinPath(global_1.ctx.extensionUri, "assets", theme + "-theme", "app.js")).toString();
    }
    const { self, type, uin } = global_1.parseContactId(id);
    const path = webview.asWebviewUri(vscode.Uri.joinPath(global_1.ctx.extensionUri, "assets")).toString();
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="referrer" content="never">
    <link rel="stylesheet" type="text/css" href="${css}" />
</head>
<body>
    <env self_id="${self}" nickname="${global_1.client.nickname}" c2c="${type === "u" ? 1 : 0}" target_id="${uin}" temp="0" path="${path}" t="${T}">
    <script src="${preload}"></script>
    <script src="${js}"></script>
</body>
</html>`;
}
const uri_root = vscode.Uri.file("/");
const uri_c = vscode.Uri.file("c:/");
const uri_d = vscode.Uri.file("d:/");
const uri_e = vscode.Uri.file("e:/");
const uri_f = vscode.Uri.file("f:/");
const uri_g = vscode.Uri.file("g:/");
function openChatView(id) {
    var _a, _b, _c;
    const { type, uin } = global_1.parseContactId(id);
    let label;
    if (type === "u") {
        label = String((_a = global_1.client.fl.get(uin)) === null || _a === void 0 ? void 0 : _a.nickname);
    }
    else {
        label = String((_b = global_1.client.gl.get(uin)) === null || _b === void 0 ? void 0 : _b.group_name);
    }
    if (webviewMap.has(id)) {
        return (_c = webviewMap.get(id)) === null || _c === void 0 ? void 0 : _c.reveal();
    }
    const webview = vscode.window.createWebviewPanel("chat", label, -1, {
        enableScripts: true,
        enableCommandUris: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
            global_1.ctx.extensionUri,
            global_1.ctx.globalStorageUri,
            uri_root, uri_c, uri_d, uri_e, uri_f, uri_g,
        ]
    });
    webviewMap.set(id, webview);
    webview.webview.html = getHtml(id, webview.webview);
    webview.reveal();
    webview.onDidDispose(() => {
        webviewMap.delete(id);
    });
    webview.onDidChangeViewState((event) => {
        if (event.webviewPanel.visible) {
            explorer_1.refreshContacts(id, false);
        }
    });
    webview.webview.onDidReceiveMessage(async (data) => {
        var _a;
        try {
            if (data.command === "getChatHistory" && ((_a = data.params) === null || _a === void 0 ? void 0 : _a[0]) === "") {
                let buf;
                if (type === "g") {
                    buf = Buffer.alloc(21);
                }
                else {
                    buf = Buffer.alloc(17);
                }
                buf.writeUInt32BE(uin, 0);
                data.params[0] = buf.toString("base64");
            }
            const fn = global_1.client[data.command];
            if (typeof fn === "function") {
                //@ts-ignore
                let ret = fn.apply(global_1.client, Array.isArray(data.params) ? data.params : []);
                if (ret instanceof Promise) {
                    ret = await ret;
                }
                if (ret.data instanceof Map) {
                    ret.data = [...ret.data.values()];
                }
                ret.echo = data.echo;
                webview.webview.postMessage(ret);
            }
        }
        catch { }
    });
}
function postC2CEvent(data) {
    var _a;
    const id = global_1.genContactId("u", data.user_id);
    (_a = webviewMap.get(id)) === null || _a === void 0 ? void 0 : _a.webview.postMessage(data);
}
function postGroupEvent(data) {
    var _a;
    const id = global_1.genContactId("g", data.group_id);
    (_a = webviewMap.get(id)) === null || _a === void 0 ? void 0 : _a.webview.postMessage(data);
}
function bind() {
    global_1.client.on("message.group", function (data) {
        var _a;
        const id = global_1.genContactId("g", data.group_id);
        if ((_a = webviewMap.get(id)) === null || _a === void 0 ? void 0 : _a.visible) {
            return;
        }
        explorer_1.refreshContacts(id, true);
    });
    global_1.client.on("message.private", function (data) {
        var _a;
        const id = global_1.genContactId("u", data.user_id);
        if ((_a = webviewMap.get(id)) === null || _a === void 0 ? void 0 : _a.visible) {
            return;
        }
        explorer_1.refreshContacts(id, true);
    });
    global_1.client.on("message.group", postGroupEvent);
    global_1.client.on("message.private", postC2CEvent);
    global_1.client.on("notice.group", postGroupEvent);
    global_1.client.on("notice.friend.recall", postC2CEvent);
    global_1.client.on("notice.friend.poke", postC2CEvent);
    global_1.client.on("sync.message", postC2CEvent);
}
exports.bind = bind;
//# sourceMappingURL=chat.js.map