"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoke = void 0;
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vscode = require("vscode");
const oicq = require("oicq");
const global_1 = require("./global");
const config_1 = require("./config");
const explorer_1 = require("./explorer");
const cdp_1 = require("./cdp");
let logining = false;
let selectedStatus = 11;
const statusMap = {
    11: "我在线上",
    60: "Q我吧",
    31: "离开",
    50: "忙碌",
    70: "请勿打扰",
    41: "隐身",
    0: "离线",
    97: "@个人资料",
    98: "@切换账号",
    99: "@设置",
    100: "@feedback"
};
/**
 * create the instance
 */
function createClient(uin) {
    const c = oicq.createClient(uin, config_1.genClientConfig());
    try {
        const stat = fs.statSync(path.join(c.dir, "online.lock"), { bigint: true });
        const diff = Date.now() - Number(stat.mtimeMs);
        if (diff >= 0 && diff < 10000) {
            vscode.window.showErrorMessage("你已经在另一个Code中登录了此账号。");
            return;
        }
    }
    catch { }
    global_1.setClient(c);
    global_1.client.on("system.login.error", function (data) {
        logining = false;
        if (data.message.includes("密码错误")) {
            config_1.setConfig({
                account: 0,
                password: ""
            });
            data.message += "(请选择：@切换账号)";
        }
        vscode.window.showErrorMessage(data.message);
    });
    global_1.client.on("system.login.qrcode", function (data) {
        const webview = vscode.window.createWebviewPanel("device", "手机QQ扫码登录 (完成后请关闭)", -1, {
            enableScripts: true,
            enableCommandUris: true
        });
        webview.webview.html = `若提示二维码已过期重新获取一次<br><img width="400px" height="400px" src="data:image/png;base64,${data.image.toString("base64")}">`;
        webview.reveal();
        webview.onDidDispose(() => {
            global_1.client.login();
        });
    });
    global_1.client.on("system.login.slider", function (data) {
        const cdp = new cdp_1.Cdp;
        cdp.on("ticket", (ticket) => {
            global_1.client.sliderLogin(ticket);
        });
        cdp.on("error", (err) => {
            vscode.window.showInformationMessage(`打开chrome失败，请 [点我](${data.url}) 完成滑动验证码并获取ticket (按F12查看网络请求以获取) [教程](https://github.com/takayama-lily/oicq/wiki/01.%E6%BB%91%E5%8A%A8%E9%AA%8C%E8%AF%81%E7%A0%81%E5%92%8C%E8%AE%BE%E5%A4%87%E9%94%81)`);
            inputTicket();
        });
        cdp.getTicket(data.url);
    });
    global_1.client.on("system.login.device", function (data) {
        const webview = vscode.window.createWebviewPanel("device", "[QQ]需要验证设备安全性 (完成后请关闭)", -1, {
            enableScripts: true,
            enableCommandUris: true
        });
        webview.webview.html = `<html style="height:100%"><body style="height:100%;padding:0"><iframe width="100%" height="100%" style="border:0" src="${data.url}"></iframe></body></html>`;
        webview.reveal();
        webview.onDidDispose(() => {
            global_1.client.login();
        });
        vscode.window.showInformationMessage(`[设备锁验证地址](${data.url}) 若vscode中无法正常显示可在浏览器中打开`);
    });
    global_1.client.on("system.offline", (data) => {
        logining = false;
        if (data.message.includes("服务器繁忙")) {
            data.message = "服务器繁忙，请过几秒后再次尝试。";
        }
        vscode.window.showErrorMessage(data.message);
    });
    global_1.client.on("system.online", function () {
        logining = false;
        if (selectedStatus !== 11) {
            this.setOnlineStatus(selectedStatus);
        }
        config_1.setConfig({
            account: this.uin,
            password: this.password_md5 ? this.password_md5.toString("hex") : "qrcode"
        });
        vscode.window.showInformationMessage(`${global_1.client.nickname}(${global_1.client.uin}) 已上线`);
        explorer_1.initLists();
    });
    inputPassword();
}
/**
 * input account
 */
function inputAccount() {
    const uin = Number(config_1.getConfig().account);
    if (uin > 10000 && uin < 0xffffffff) {
        return createClient(uin);
    }
    vscode.window.showInputBox({
        placeHolder: "输入QQ账号...",
    }).then((uin) => {
        if (!uin) {
            return;
        }
        try {
            createClient(Number(uin));
        }
        catch {
            inputAccount();
        }
    });
}
/**
 * input password of account
 */
function inputPassword() {
    const password = String(config_1.getConfig().password);
    if (password === "qrcode") {
        return global_1.client.login();
    }
    else if (password) {
        return global_1.client.login(password);
    }
    vscode.window.showInputBox({
        placeHolder: "输入密码... (扫码登录请留空)",
        prompt: `输入账号 ${global_1.client.uin} 的密码`,
        password: true
    }).then((pass) => {
        if (!pass) {
            return global_1.client.login();
        }
        const password = crypto.createHash("md5").update(pass).digest();
        logining = true;
        global_1.client.login(password);
    });
}
/**
 * input ticket from slider catpcha
 */
function inputTicket() {
    vscode.window.showInputBox({ placeHolder: "输入验证码ticket" })
        .then((ticket) => {
        if (!ticket) {
            inputTicket();
        }
        else {
            global_1.client.sliderLogin(ticket);
        }
    });
}
function showProfile() {
    const arr = [
        "账号：" + global_1.client.uin + " (点击复制)",
        "昵称：" + global_1.client.nickname + " (点击设置)",
        "性别：" + global_1.client.sex + " (点击设置)",
        "年龄：" + global_1.client.age + " (点击设置)",
        "个性签名 (点击设置)"
    ];
    vscode.window.showQuickPick(arr).then((value) => {
        switch (value) {
            case arr[0]:
                vscode.env.clipboard.writeText(`${global_1.client.nickname} (${global_1.client.uin})`);
                break;
            case arr[1]:
                vscode.window.showInputBox({ placeHolder: "输入新的昵称...", prompt: "当前昵称为：" + global_1.client.nickname })
                    .then((value) => {
                    if (value) {
                        global_1.client.setNickname(value);
                    }
                });
                break;
            case arr[2]:
                vscode.window.showInputBox({ placeHolder: "输入性别数字...", prompt: "0: unknown; 1: male; 2: female" })
                    .then((value) => {
                    if (value) {
                        //@ts-ignore
                        global_1.client.setGender(Number(value));
                    }
                });
                break;
            case arr[3]:
                vscode.window.showInputBox({ placeHolder: "输入生日...", prompt: "格式为：20020202" })
                    .then((value) => {
                    if (value) {
                        global_1.client.setBirthday(value);
                    }
                });
                break;
            case arr[4]:
                vscode.window.showInputBox({ placeHolder: "输入个性签名..." })
                    .then((value) => {
                    if (value) {
                        global_1.client.setSignature(value);
                    }
                });
                break;
        }
    });
}
function invoke() {
    const tmp = { ...statusMap };
    if (!global_1.client || !global_1.client.isOnline()) {
        tmp[0] += " (当前)";
    }
    else {
        tmp[global_1.client.online_status] += " (当前)";
    }
    const arr = Object.values(tmp);
    vscode.window.showQuickPick(arr)
        .then((value) => {
        if (value === "@设置") {
            return config_1.openConfigFile();
        }
        if (logining) {
            vscode.window.showInformationMessage("正在登录中，请稍后...");
            return;
        }
        if (value === "@切换账号") {
            global_1.client === null || global_1.client === void 0 ? void 0 : global_1.client.logout();
            config_1.deleteToken();
            config_1.setConfig({
                account: 0,
                password: ""
            });
            return inputAccount();
        }
        if (value === "@个人资料") {
            if (global_1.client) {
                showProfile();
            }
            return;
        }
        if (value === "@feedback") {
            vscode.env.openExternal(vscode.Uri.parse("https://github.com/takayama-lily/vscode-qq/issues"));
            return;
        }
        if (value === null || value === void 0 ? void 0 : value.includes("离线")) {
            global_1.client === null || global_1.client === void 0 ? void 0 : global_1.client.logout();
        }
        else if (value) {
            const i = arr.indexOf(value);
            selectedStatus = Number(Object.keys(statusMap)[i]);
            if (global_1.client) {
                if (!global_1.client.isOnline()) {
                    global_1.client.login();
                }
                else {
                    global_1.client.setOnlineStatus(selectedStatus);
                }
            }
            else {
                inputAccount();
            }
        }
    });
}
exports.invoke = invoke;
//# sourceMappingURL=client.js.map