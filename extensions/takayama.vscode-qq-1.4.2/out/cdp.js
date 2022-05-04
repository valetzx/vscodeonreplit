"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cdp = exports.UNFINISHED_ERROR = exports.TIMEOUT_ERROR = exports.NO_CHROME_ERROR = void 0;
const child_process = require("child_process");
const EventEmitter = require("events");
const http = require("http");
const os = require("os");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const getAnUnusedPort = require("get-port");
const tmpdir = path.join(os.tmpdir(), "vscode-qq");
const params = [
    "--disable-extensions",
    "--enable-automation",
    "--no-sandbox",
    "--headeless",
    "--disable-gpu",
];
exports.NO_CHROME_ERROR = Symbol("no chrome");
exports.TIMEOUT_ERROR = Symbol("failed too many times");
exports.UNFINISHED_ERROR = Symbol("chrome closed but no ticket");
class Cdp extends EventEmitter {
    constructor() {
        super(...arguments);
        this.port = 0;
        this.url = "";
        this.webSocketDebuggerUrl = "";
        this.ticket = "";
    }
    async openChrome(url) {
        this.port = await getAnUnusedPort();
        if (!fs.existsSync(tmpdir)) {
            fs.mkdirSync(tmpdir);
        }
        let cmd = "";
        if (os.platform().includes("win")) {
            cmd = "cmd /c start chrome.exe";
        }
        else {
            cmd = "chrome";
        }
        cmd += ` "${url}" `;
        cmd += params.join(" ")
            + " --user-data-dir=" + tmpdir
            + " --remote-debugging-port=" + this.port;
        this.url = url;
        child_process.execSync(cmd);
    }
    getWebSocketDebuggerUrl() {
        http.get("http://localhost:" + this.port + "/json/list", (res) => {
            res.setEncoding("utf-8");
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    const obj = JSON.parse(data);
                    for (let o of obj) {
                        if (o.url === this.url) {
                            this.webSocketDebuggerUrl = o.webSocketDebuggerUrl;
                        }
                    }
                }
                catch { }
            });
        }).on("error", () => { });
    }
    _getTicket() {
        const ws = new WebSocket(this.webSocketDebuggerUrl);
        ws.on("open", () => {
            ws.send(JSON.stringify({
                id: 1,
                method: "Network.enable"
            }));
        });
        ws.on("error", () => { });
        ws.on("close", () => {
            if (!this.ticket) {
                this.emit("error", exports.UNFINISHED_ERROR);
            }
            else {
                this.emit("ticket", this.ticket);
            }
        });
        ws.on("message", (data) => {
            try {
                const obj = JSON.parse(String(data));
                if (obj.method === "Network.responseReceived" && obj.params.type === "XHR" && obj.params.response.url === "https://t.captcha.qq.com/cap_union_new_verify") {
                    ws.send(JSON.stringify({
                        id: 2,
                        method: "Network.getResponseBody",
                        params: {
                            requestId: obj.params.requestId
                        },
                    }));
                }
                else if (obj.id === 2) {
                    const body = JSON.parse(obj.result.body);
                    this.ticket = body.ticket;
                    if (this.ticket) {
                        ws.send(JSON.stringify({
                            id: 3,
                            method: "Browser.close"
                        }));
                        ws.close();
                    }
                }
            }
            catch { }
        });
    }
    async getTicket(url) {
        try {
            await this.openChrome(url);
        }
        catch {
            this.emit("error", exports.NO_CHROME_ERROR);
            return;
        }
        this.getWebSocketDebuggerUrl();
        let times = 1;
        const id = setInterval(() => {
            ++times;
            if (this.webSocketDebuggerUrl) {
                clearInterval(id);
                this._getTicket();
            }
            else {
                if (times >= 10) {
                    clearInterval(id);
                    this.emit("error", exports.TIMEOUT_ERROR);
                }
                else {
                    this.getWebSocketDebuggerUrl();
                }
            }
        }, 1000);
    }
}
exports.Cdp = Cdp;
//# sourceMappingURL=cdp.js.map