"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPinned = exports.writePinned = exports.deleteToken = exports.openConfigFile = exports.genClientConfig = exports.setConfig = exports.getConfig = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const global_1 = require("./global");
const optimized = {
    account: 0,
    password: "",
    platform: 5,
    show_me_add_group_request: false,
    theme: "default",
    theme_css: "",
    theme_js: "",
};
let config;
function getConfigFilePath() {
    return path.join(global_1.ctx.globalStoragePath, "config.json");
}
function getConfig() {
    if (!config) {
        try {
            config = JSON.parse(fs.readFileSync(getConfigFilePath(), { encoding: "utf-8" }));
        }
        catch {
            fs.writeFile(getConfigFilePath(), JSON.stringify(optimized, null, 2), global_1.NOOP);
            config = { ...optimized };
        }
    }
    //@ts-ignore
    return config;
}
exports.getConfig = getConfig;
function setConfig(obj) {
    Object.assign(getConfig(), obj);
    fs.writeFile(getConfigFilePath(), JSON.stringify(config, null, 2), global_1.NOOP);
}
exports.setConfig = setConfig;
function genClientConfig() {
    const clientConfig = {
        log_level: "off",
        kickoff: false,
        ignore_self: false,
        brief: true,
        reconn_interval: 0,
        data_dir: global_1.ctx.globalStoragePath,
    };
    return Object.assign(clientConfig, getConfig());
}
exports.genClientConfig = genClientConfig;
let watcherCreatedFlag = false;
function openConfigFile() {
    getConfig();
    const uri = vscode.Uri.file(getConfigFilePath());
    vscode.window.showTextDocument(uri);
    if (!watcherCreatedFlag) {
        watcherCreatedFlag = true;
        vscode.workspace.createFileSystemWatcher(getConfigFilePath(), true, false, true).onDidChange(async () => {
            try {
                config = JSON.parse(await fs.promises.readFile(getConfigFilePath(), { encoding: "utf-8" }));
            }
            catch {
                vscode.window.showErrorMessage("配置文件中有错误，请检查。");
            }
        });
    }
}
exports.openConfigFile = openConfigFile;
function deleteToken() {
    if (global_1.client) {
        fs.unlink(path.join(global_1.client.dir, "token"), global_1.NOOP);
        fs.unlink(path.join(global_1.client.dir, "t106"), global_1.NOOP);
    }
}
exports.deleteToken = deleteToken;
function writePinned(pinned) {
    fs.writeFile(path.join(global_1.client.dir, "pinned"), pinned.join("\n"), global_1.NOOP);
}
exports.writePinned = writePinned;
async function readPinned() {
    try {
        const pinned = await fs.promises.readFile(path.join(global_1.client.dir, "pinned"), { encoding: "utf-8" });
        return String(pinned).split("\n");
    }
    catch {
        return [];
    }
}
exports.readPinned = readPinned;
//# sourceMappingURL=config.js.map