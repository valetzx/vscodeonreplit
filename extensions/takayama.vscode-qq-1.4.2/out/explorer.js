"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshContacts = exports.initLists = void 0;
const vscode = require("vscode");
const config_1 = require("./config");
const global_1 = require("./global");
const chat = require("./chat");
// 声明
let friendListTreeDataProvider;
let groupListTreeDataProvider;
let pinnedTreeDataProvider;
let itemMap = new Map;
let firendTreeView;
let groupTreeView;
class ContactTreeItem extends vscode.TreeItem {
    constructor(id) {
        super(id);
        this.new = 0;
        this.pinned = false;
        this.id = id;
    }
    ;
    updateLabel(emoji, name, remark) {
        this.label = emoji + (remark || name) + (this.new > 0 ? ` (+${this.new})` : "");
        this.tooltip = emoji + name + ` (${global_1.parseContactId(this.id).uin})`;
    }
}
class ContactListTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    getParent(id) {
        return null;
    }
    getTreeItem(id) {
        const { type, uin } = global_1.parseContactId(id);
        let item = itemMap.get(id);
        if (!item) {
            item = new ContactTreeItem(id);
            if (type === "u") {
                item.command = {
                    title: "打开私聊", command: "oicq.c2c.open", arguments: [id]
                };
            }
            else {
                item.command = {
                    title: "打开群聊", command: "oicq.group.open", arguments: [id]
                };
            }
            itemMap.set(id, item);
        }
        if (type === "u") {
            const friend = global_1.client.fl.get(uin);
            const emoji = (friend === null || friend === void 0 ? void 0 : friend.sex) === "female" ? "🙎‍♀️" : "🙎‍♂️";
            item.updateLabel(emoji, friend === null || friend === void 0 ? void 0 : friend.nickname, friend === null || friend === void 0 ? void 0 : friend.remark);
        }
        else {
            const group = global_1.client.gl.get(uin);
            item.updateLabel("👨‍👦‍👦", group === null || group === void 0 ? void 0 : group.group_name);
        }
        return item;
    }
    refresh(id) {
        this._onDidChangeTreeData.fire(id);
    }
}
class FriendListTreeDataProvider extends ContactListTreeDataProvider {
    getChildren() {
        var _a;
        const children = [];
        for (const uin of global_1.client === null || global_1.client === void 0 ? void 0 : global_1.client.fl.keys()) {
            const id = global_1.genContactId("u", uin);
            if ((_a = itemMap.get(id)) === null || _a === void 0 ? void 0 : _a.new) {
                children.unshift(id);
            }
            else {
                children.push(id);
            }
        }
        return children;
    }
}
class GroupListTreeDataProvider extends ContactListTreeDataProvider {
    getChildren() {
        var _a;
        const children = [];
        for (const uin of global_1.client === null || global_1.client === void 0 ? void 0 : global_1.client.gl.keys()) {
            const id = global_1.genContactId("g", uin);
            if ((_a = itemMap.get(id)) === null || _a === void 0 ? void 0 : _a.new) {
                children.unshift(id);
            }
            else {
                children.push(id);
            }
        }
        return children;
    }
}
class PinnedTreeDataProvider extends ContactListTreeDataProvider {
    constructor() {
        super(...arguments);
        this.inited = false;
    }
    async getChildren() {
        const children = [];
        if (this.inited) {
            for (const item of itemMap.values()) {
                if (item.pinned) {
                    children.push(item.id);
                }
            }
        }
        else {
            const pinned = await config_1.readPinned();
            for (const item of itemMap.values()) {
                if (pinned.includes(item.id)) {
                    item.pinned = true;
                    children.push(item.id);
                }
            }
            this.inited = true;
        }
        return children;
    }
}
// 注册指令
vscode.commands.registerCommand("oicq.contact.pin", (id) => {
    const item = itemMap.get(id);
    if (item) {
        item.pinned = true;
    }
    pinnedTreeDataProvider.refresh();
    pinnedTreeDataProvider.getChildren().then(config_1.writePinned);
});
vscode.commands.registerCommand("oicq.contact.unpin", (id) => {
    const item = itemMap.get(id);
    if (item) {
        item.pinned = false;
    }
    pinnedTreeDataProvider.refresh();
    pinnedTreeDataProvider.getChildren().then(config_1.writePinned);
});
vscode.commands.registerCommand("oicq.tooltip.copy", (id) => {
    var _a;
    const tooltip = (_a = itemMap.get(id)) === null || _a === void 0 ? void 0 : _a.tooltip;
    if (tooltip) {
        vscode.env.clipboard.writeText(String(tooltip));
    }
});
vscode.commands.registerCommand("oicq.contact.profile", async (id) => {
    const { uin, type } = global_1.parseContactId(id);
    const arr = [];
    if (type === "u") {
        const data = (await global_1.client.getStrangerInfo(uin, true)).data;
        if (data) {
            arr.push("账号：" + data.user_id);
            arr.push("昵称：" + data.nickname);
            arr.push("性别：" + data.sex);
            arr.push("年龄：" + data.age);
            arr.push("地区：" + data.area);
        }
    }
    else {
        const data = (await global_1.client.getGroupInfo(uin, true)).data;
        if (data) {
            arr.push("群号：" + data.group_id);
            arr.push("群名：" + data.group_name);
            arr.push(`人数：${data.member_count}/${data.max_member_count}`);
            arr.push("等级：" + data.grade);
            arr.push("活跃人数：" + data.active_member_count);
            arr.push("创建时间：" + new Date(data.create_time * 1000));
        }
    }
    vscode.window.showQuickPick(arr);
});
vscode.commands.registerCommand("oicq.friend.search", () => {
    if (!firendTreeView) {
        return vscode.window.showErrorMessage("请先登录");
    }
    const arr = [];
    for (let [k, v] of global_1.client.fl) {
        arr.push(v.nickname + " (" + v.user_id + ")");
    }
    vscode.window.showQuickPick(arr).then((value) => {
        if (value) {
            const uin = value.slice(value.lastIndexOf("(") + 1, -1);
            firendTreeView.reveal(global_1.genContactId("u", Number(uin)), { focus: true, select: true });
        }
    });
});
vscode.commands.registerCommand("oicq.group.search", () => {
    if (!groupTreeView) {
        return vscode.window.showErrorMessage("请先登录");
    }
    const arr = [];
    for (let [k, v] of global_1.client.gl) {
        arr.push(v.group_name + " (" + v.group_id + ")");
    }
    vscode.window.showQuickPick(arr).then((value) => {
        if (value) {
            const uin = value.slice(value.lastIndexOf("(") + 1, -1);
            groupTreeView.reveal(global_1.genContactId("g", Number(uin)), { focus: true, select: true });
        }
    });
});
vscode.commands.registerCommand("oicq.group.invite", (id) => {
    var _a, _b;
    const { uin, type } = global_1.parseContactId(id);
    let placeHolder, gid, uid;
    const arr = [];
    if (type === "u") {
        uid = uin;
        for (let [k, v] of global_1.client.gl) {
            arr.push("👨‍👦‍👦" + v.group_name + " (" + v.group_id + ")");
        }
        placeHolder = "选择一个群，邀请好友 " + ((_a = itemMap.get(id)) === null || _a === void 0 ? void 0 : _a.tooltip) + " 加入";
    }
    else {
        gid = uin;
        for (let [k, v] of global_1.client.fl) {
            arr.push(v.nickname + " (" + v.user_id + ")");
        }
        placeHolder = "选择好友，邀请TA加入群 " + ((_b = itemMap.get(id)) === null || _b === void 0 ? void 0 : _b.tooltip);
    }
    vscode.window.showQuickPick(arr, { placeHolder }).then((value) => {
        if (value) {
            const uin = value.slice(value.lastIndexOf("(") + 1, -1);
            if (!gid) {
                gid = Number(uin);
            }
            if (!uid) {
                uid = Number(uin);
            }
            global_1.client.inviteFriend(gid, uid).then((data) => {
                if (data.retcode === 0) {
                    vscode.window.showInformationMessage("邀请发送成功。");
                }
                else {
                    vscode.window.showErrorMessage("邀请失败，请确认你是否有邀请的权限，或对方已经入群。");
                }
            });
        }
    });
});
vscode.commands.registerCommand("oicq.friend.delete", (id) => {
    var _a;
    vscode.window.showInformationMessage(`确定要删除好友 ${(_a = itemMap.get(id)) === null || _a === void 0 ? void 0 : _a.tooltip} ？`, "仅删除", "删除并拉黑")
        .then((value) => {
        const { uin } = global_1.parseContactId(id);
        if (value === "仅删除") {
            global_1.client.deleteFriend(uin, false);
        }
        else if (value === "删除并拉黑") {
            global_1.client.deleteFriend(uin, true);
        }
    });
});
vscode.commands.registerCommand("oicq.group.delete", (id) => {
    var _a;
    vscode.window.showInformationMessage(`确定要退出群 ${(_a = itemMap.get(id)) === null || _a === void 0 ? void 0 : _a.tooltip} ？`, "是")
        .then((value) => {
        const { uin } = global_1.parseContactId(id);
        if (value === "是") {
            global_1.client.setGroupLeave(uin).then(() => {
                setTimeout(() => {
                    groupListTreeDataProvider.refresh();
                    pinnedTreeDataProvider.refresh();
                }, 500);
            });
        }
    });
});
vscode.commands.registerCommand("oicq.pinned.refresh", () => {
    pinnedTreeDataProvider === null || pinnedTreeDataProvider === void 0 ? void 0 : pinnedTreeDataProvider.refresh();
});
vscode.commands.registerCommand("oicq.friends.refresh", () => {
    friendListTreeDataProvider === null || friendListTreeDataProvider === void 0 ? void 0 : friendListTreeDataProvider.refresh();
});
vscode.commands.registerCommand("oicq.groups.refresh", () => {
    groupListTreeDataProvider === null || groupListTreeDataProvider === void 0 ? void 0 : groupListTreeDataProvider.refresh();
});
/**
 * system.online
 */
async function initLists() {
    itemMap = new Map;
    friendListTreeDataProvider = new FriendListTreeDataProvider;
    vscode.window.registerTreeDataProvider("chat-friends", friendListTreeDataProvider);
    groupListTreeDataProvider = new GroupListTreeDataProvider;
    vscode.window.registerTreeDataProvider("chat-groups", groupListTreeDataProvider);
    pinnedTreeDataProvider = new PinnedTreeDataProvider;
    vscode.window.registerTreeDataProvider("chat-pinned", pinnedTreeDataProvider);
    firendTreeView = vscode.window.createTreeView("chat-friends", {
        treeDataProvider: friendListTreeDataProvider
    });
    firendTreeView.reveal("");
    groupTreeView = vscode.window.createTreeView("chat-groups", {
        treeDataProvider: groupListTreeDataProvider
    });
    groupTreeView.reveal("");
    if (!global_1.client.listenerCount("notice.friend.increase")) {
        global_1.client.on("notice.friend.increase", function (data) {
            vscode.window.showInformationMessage(`新增了好友：${data.nickname} (${data.user_id})`);
            friendListTreeDataProvider.refresh();
            pinnedTreeDataProvider.refresh();
        });
        global_1.client.on("notice.friend.decrease", function (data) {
            vscode.window.showInformationMessage(`删除了好友：${data.nickname} (${data.user_id})`);
            friendListTreeDataProvider.refresh();
            pinnedTreeDataProvider.refresh();
        });
        global_1.client.on("notice.friend.profile", function (data) {
            const id = global_1.genContactId("u", data.user_id);
            friendListTreeDataProvider.refresh(id);
            pinnedTreeDataProvider.refresh(id);
        });
        global_1.client.on("notice.group.increase", function (data) {
            var _a;
            if (data.user_id === this.uin) {
                vscode.window.showInformationMessage(`你已加入群：${(_a = this.gl.get(data.group_id)) === null || _a === void 0 ? void 0 : _a.group_name} (${data.group_id})`);
                groupListTreeDataProvider.refresh();
                pinnedTreeDataProvider.refresh();
            }
        });
        global_1.client.on("notice.group.decrease", function (data) {
            var _a;
            if (data.user_id === this.uin) {
                let msg;
                const label = (_a = itemMap.get(global_1.genContactId("g", data.group_id))) === null || _a === void 0 ? void 0 : _a.tooltip;
                if (data.dismiss) {
                    msg = label + ` 已解散`;
                }
                else if (data.operator_id === this.uin) {
                    msg = `你退出了群 ` + label;
                }
                else {
                    msg = `${data.operator_id} 将你踢出了群 ` + label;
                }
                vscode.window.showInformationMessage(msg);
                groupListTreeDataProvider.refresh();
                pinnedTreeDataProvider.refresh();
            }
        });
        global_1.client.on("notice.group.setting", function (data) {
            if (data.group_name) {
                const id = global_1.genContactId("g", data.group_id);
                groupListTreeDataProvider.refresh(id);
                pinnedTreeDataProvider.refresh(id);
            }
        });
        global_1.client.on("notice.group.transfer", function (data) {
            var _a;
            if (data.user_id === this.uin) {
                const label = (_a = itemMap.get(global_1.genContactId("g", data.group_id))) === null || _a === void 0 ? void 0 : _a.tooltip;
                const msg = `${label} 群主已将群主身份转让给你`;
                vscode.window.showInformationMessage(msg);
            }
        });
        global_1.client.on("notice.group.admin", function (data) {
            var _a;
            if (data.user_id === this.uin) {
                const label = (_a = itemMap.get(global_1.genContactId("g", data.group_id))) === null || _a === void 0 ? void 0 : _a.tooltip;
                const msg = data.set ? `你已成为群 ${label} 的管理员` : `你被取消了群 ${label} 的管理员`;
                vscode.window.showInformationMessage(msg);
            }
        });
        global_1.client.on("request.friend.add", function (data) {
            vscode.window.showInformationMessage(`${data.nickname}(${data.user_id}) 请求添加你为好友，来自 ${data.source}。附加信息：${data.comment}`, "同意", "拒绝", "拒绝并拉黑")
                .then((value) => {
                if (value === "同意") {
                    this.setFriendAddRequest(data.flag);
                }
                else if (value = "拒绝") {
                    this.setFriendAddRequest(data.flag, false);
                }
                else if (value = "拒绝并拉黑") {
                    this.setFriendAddRequest(data.flag, false, "", true);
                }
            });
        });
        global_1.client.on("request.group.invite", function (data) {
            vscode.window.showInformationMessage(`${data.nickname}(${data.user_id}) 邀请你加入群 ${data.group_name}(${data.group_id})。`, "同意", "拒绝", "拒绝并拉黑")
                .then((value) => {
                if (value === "同意") {
                    this.setGroupAddRequest(data.flag);
                }
                else if (value = "拒绝") {
                    this.setGroupAddRequest(data.flag, false);
                }
                else if (value = "拒绝并拉黑") {
                    this.setGroupAddRequest(data.flag, false, "", true);
                }
            });
        });
        global_1.client.on("request.group.add", function (data) {
            // @ts-ignore
            if (!this.config.show_me_add_group_request) {
                return;
            }
            vscode.window.showInformationMessage(`${data.nickname}(${data.user_id}) 申请加入群 ${data.group_name}(${data.group_id})。附加信息：${data.comment}`, "同意", "拒绝", "拒绝并拉黑")
                .then((value) => {
                if (value === "同意") {
                    this.setGroupAddRequest(data.flag);
                }
                else if (value = "拒绝") {
                    this.setGroupAddRequest(data.flag, false);
                }
                else if (value = "拒绝并拉黑") {
                    this.setGroupAddRequest(data.flag, false, "", true);
                }
            });
        });
        chat.bind();
    }
}
exports.initLists = initLists;
/**
 * 刷新treeItems
 * @param flag true:有新消息 false:解除新消息
 */
function refreshContacts(id, flag) {
    const item = itemMap.get(id);
    const { type } = global_1.parseContactId(id);
    const provider = type === "u" ? friendListTreeDataProvider : groupListTreeDataProvider;
    if (!item) {
        provider.refresh();
        pinnedTreeDataProvider.refresh();
        return;
    }
    if (flag) {
        ++item.new;
        if (item.new > 1) {
            provider.refresh(id);
            pinnedTreeDataProvider.refresh(id);
        }
        else {
            provider.refresh();
            pinnedTreeDataProvider.refresh(id);
        }
    }
    else {
        if (!item.new) {
            return;
        }
        else {
            item.new = 0;
            provider.refresh(id);
            pinnedTreeDataProvider.refresh(id);
        }
    }
}
exports.refreshContacts = refreshContacts;
/**
 * 列表刷新规则：
 *
 *  好友增加减少时：全部刷新
 *  群增加减少时：全部刷新
 *  好友修改昵称时：单个刷新
 *  群名变更时：单个刷新
 *
 *  收到新消息时：
 *      列表中不存在时：全部刷新
 *      之前无新消息时：全部刷新(新消息+1)
 *      之前有新消息时：单个刷新(新消息+1)
 *      视图已打开并可见时：不刷新
 *      视图已打开不可见时：
 *          之前无新消息时：全部刷新(新消息+1)
 *          之前有新消息时：单个刷新(新消息+1)
 *
 *  打开视图时/视图聚焦时：
 *      之前无新消息时：不刷新
 *      之前有新消息时：单个刷新(新消息置0)
 *
 * (全部刷新的目的在于排序)
 */
//# sourceMappingURL=explorer.js.map