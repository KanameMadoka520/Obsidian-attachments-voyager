# 参与贡献 Obsidian Attachments Voyager (贡献者指南)

首先，非常感谢你有兴趣为 **Obsidian Attachments Voyager** 做出贡献！🎉
无论你是想修复一个 Bug、添加一个新特性，还是仅仅想改进这篇文档，你的帮助对我们都至关重要。

为了让大家的协作更顺畅，避免你在环境配置上踩坑（特别是那些让人头疼的 C++ 库和底层依赖），请务必在提交代码前仔细阅读这份指南。

---

## 🛠 1. 环境准备 (Environment Setup)

本项目采用的是 **Tauri v1.x + React + Rust** 架构。
**请绝对注意**：我们由于历史系统兼容性（如 Linux 环境下 `glib-2.0` 版本较低），特意将 Tauri 锁定在了 `1.5` 左右的版本。**请不要在提交 PR 时顺手“热心”地把 Tauri 升级到 v2**，否则会导致很多用户的构建直接原地爆炸💥！

在开始之前，请确保你的电脑上安装了以下“三大件”：

### ① Node.js & npm
建议使用 **Node 18** 或 **Node 20**（LTS版本）。
你可以通过终端验证：
```bash
node -v
npm -v
```

### ② Rust & Cargo
Tauri 后端基于 Rust 编写。如果你还没有安装 Rust，请前往官网使用 `rustup` 安装：
[Rust 官方安装指南](https://www.rust-lang.org/tools/install)
验证安装：
```bash
rustc -V
cargo -V
```

### ③ 系统级依赖 (仅 Linux/开发者 必需)
如果你在使用 Linux 桌面 (如 Ubuntu/Debian 容器)进行开发，你需要安装 WebKit 等图形界面开发包：
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## 💻 2. 本地开发流程 (Local Development)

### 步骤 1：克隆仓库并安装依赖
把代码拉到你本地后，首先进入项目根目录安装前端 Node 依赖：
```bash
cd Obsidian-attachments-voyager
npm install
```

### 步骤 2：启动开发者模式 (边写边看)
想要在修改 React 前端代码或 Rust 后端代码时实时看到效果？只需要一行命令：
```bash
npm run tauri:dev
```
这将启动 Vite 开发服务器，并自动打开一个 Tauri 桌面窗口。并且，当你修改 `src-tauri/src/` 下的 Rust 代码时，Tauri 会聪明地自动重新编译后端为你呈现最新效果。

对于纯后端逻辑测试（TDD推荐方式）：
```bash
cd src-tauri
cargo test
```

---

## 🚀 3. 打包构建与调试 (Building)

当你完成了开发，想要自己打个包试试看兼不兼容时：
```bash
npm run tauri:build
```
> **注意：**
> 1. 打包生成的产物在哪？Windows 会在 `src-tauri/target/release/bundle/nsis` 吐出 `.exe`；Mac 会在 `bundle/dmg` 吐出 `.dmg`。
> 2. 如果你在 Linux 下开发且遇到打包最后一步 `failed to build data folders...` 报错，那是因为系统找不到正确的图标文件。此时如果只想测试二进制文件，可以去 `src-tauri/tauri.conf.json` 把 `bundle.active` 临时改为 `false`。

---

## 🔏 4. 提交代码流程 (PR Workflow)

我们非常欢迎你提交 Pull Request (PR)！请遵循以下简单的流程：

1. **Fork 本仓库** 到你自己的 GitHub 账号下。
2. **克隆(Clone)** 你 Fork 出来的仓库到本地。
3. **创建一个新分支 (Branch)**，用来开发你的功能或修复 Bug：
   ```bash
   git checkout -b feature/your-awesome-feature
   # 或者
   git checkout -b fix/annoying-bug
   ```
4. **提交(Commit)** 你的修改。请尽量让你的 Commit message 描述清晰。一次提交只做一件事，**不要在同一提交中混合重构与新功能**。
5. **推送到远程 (Push)**：
   ```bash
   git push origin feature/your-awesome-feature
   ```
6. 回到本项目的 GitHub 页面，点击 **Compare & pull request**，填写描述并提交！

---

## 🛡️ 5. 安全边界与核心原则 (Security Boundaries)

由于这是一个对用户 Obsidian 本地笔记文件和图片进行操作的工具，**数据安全是我们的最高优先级底线！**

在开发任何涉及文件操作的 Rust 代码时，请务必遵守以下原则：

- **只读先行，预览为主**：任何删除 (`trash/remove`) 或移动 (`rename/move`) 文件的动作，绝对不可以悄悄在后台自动执行。必须先通过 `ScanResult` 返回给前端，让用户在界面上“肉眼看到”并点击“确认执行”按钮后，才能触发破坏性动作。
- **永远提供后悔药**：目前删除实现为直接 `fs::remove_file`（永久删除、不可自动撤回）。如果未来要改为“移入系统回收站”，请单独提交 PR 并补充测试与说明。
- **出错立刻中止 (Fail Fast)**：如果在批量移动图片时，第 3 张图片移动失败（由于权限不足或目标已存在），程序必须立刻停下并向界面抛出明确的 Error 日志，严禁吞掉错误并继续盲目移动剩下的图片。

---

## 📝 6. 代码规范 (Coding Standards)

保持代码整洁有助于后期维护：
- **前端 (React/TS)**：我们使用 TypeScript。请尽量少用 `any`。遵循现有的 ESLint 规范。组件命名请保持 PascalCase。
- **后端 (Rust)**：提交前请运行 `cargo fmt` 格式化代码，并用 `cargo clippy` 检查有没有明显的坏味道（warnings）。

---

感谢花时间阅读这份指南！
如果准备好了，那就开始尽情 Hack 吧！✨
