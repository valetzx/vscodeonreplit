# vscodeonreplit
在Replit部署vscode-server

### 注意！！！默认密码为：chagethispswd 请在 `.config\code-server\config.yaml` 中修改！注意保护隐私！！

```yaml
bind-addr: 127.0.0.1:8080
auth: password
password: chagethispswd <-只要改这个
cert: false
```

个人版（不推荐）：

<a href="https://repl.it/github/valetzx/vscodeonreplit">
  <img alt="Run on Repl.it" src="https://repl.it/badge/github/valetzx/vscodeonreplit" style="height: 40px; width: 190px;" />
</a>

教育版：

将以下代码粘贴至Replit Shell后回车

`git clone https://github.com/valetzx/vscodeonreplit && mv -b vscodeonreplit/* ./ && mv -b vscodeonreplit/.[^.]* ./ && rm -rf *~ && rm -rf vscodeonreplit`

当加载完 Loading Nix environment... 后点击绿色 ▶ Run

