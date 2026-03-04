# Obsidian Attachments Voyager (附件巡游者)

Obsidian Attachments Voyager 是一个跨平台桌面工具，专为 Obsidian 重度用户设计！它用于扫描 Obsidian 仓库中的附件，能够精准识别出**未引用图片（一直占用空间但没有任何笔记用了它）**与**错位图片（图片不在笔记同级的 attachments 文件夹下）**。

工具采用“先扫描预览、后确认执行”的安全流程，绝不自动删除你的任何宝贵数据。

---

## 🛑 使用前提说明 (非常重要！)

**本工具是基于一套特定的 Obsidian 附件管理规范而量身定制的。**
在使用本项目扫描你的仓库前，请务必确认你的 Obsidian 内置设置与下述情况相符，否则我们提取的错位逻辑（misplaced）可能会将正常存放的图片误判！

请打开 Obsidian 的 **设置 (Settings) -> 文件与链接 (Files & Links)**，确保你的设定如下：

1. **附件默认存放路径** (Default location for new attachments)：
   👉 必须设定为：**当前文件所在文件夹下指定的子文件夹 (In subfolder under current folder)**
2. **子文件夹名称** (Subfolder name)：
   👉 必须填入：**`attachments`**
   *(这意味着如果你的笔记在 `vault/folder/` 下，图片会自动保存到 `vault/folder/attachments/` 下)*
3. **内部链接类型** (New link format)：
   👉 推荐设定为：**基于当前笔记的相对路径 (Relative path to file)**
4. **始终更新内部链接** (Automatically update internal links)：
   👉 强烈建议：**开启** *(重命名或移动文件时，Obsidian 会帮你维护关系不至于断链)*

只要你的 Obsidian 遵循了这种规范，本工具就能完美地帮你把那些不在子 `attachments` 目录下“乱跑”的错位图片给揪出来，并且帮你找到那些已经没用的垃圾孤儿图！

---

## 🖼️ 画廊缩略图（默认开启）

扫描页提供“Orphan/Misplaced 画廊”用于快速预览问题图片。

- 默认会在扫描时生成 **256px** 缩略图（扫描速度会变慢，但画廊预览更直观）。
- 缩略图会缓存到 **可执行文件同级目录**：`/.voyager-gallery-cache/`
- 在画廊区域提供 **“清除缩略图缓存”** 按钮，可删除该目录下所有缓存缩略图文件。

> 说明：缩略图是为了提升画廊展示稳定性与加载速度，问题列表与修复逻辑仍以原始 `imagePath` 为准。

---

## ✅ 选择操作说明

在问题列表与画廊中均支持以下选择方式：

- 普通点击：单选 / 取消
- Ctrl / ⌘：切换多选
- Shift：区间选择

---

本项目基于 **Tauri v1.x + React + Rust** 构建。

> **⚠️ 为什么是 Tauri v1 而不是最新的 v2？（小白和遗忘者注意）**
>
> 在早期的开发环境（比如基于 `node:18-bullseye` 的 Linux 容器或较老的操作系统）中，系统的 `glib-2.0` 版本通常较低（如 `2.66.8`）。
>
> 而 Tauri v2 强制要求 `glib-2.0 >= 2.70`，这会导致在这类老系统下执行 `npm run tauri:build` 时一直报错且无法绕过。而本软件就是在这样被锁死的 Docker 环境下坚持冲破黎明的。
>
> **因此，本项目已锁定使用最高兼容易用的 Tauri v1.5.0**。只要你不手贱去升级 `Cargo.toml` 和 `package.json` 中的 tauri 版本为 `^2.0`，在任何新老系统上都能完美、顺滑地编译！

---

## 🚀 开发与编译指南 (保姆级教程)

如果你想自己从源码编译这个软件（无论你是为了修改它，还是想自己打一个安全放心的包），请严格按照以下步骤进行。

### 1. 准备你的环境

无论你在什么操作系统上，你都需要准备好以下两个“发动机”：
1.  **Node.js**: 推荐安装 Node 18 或 Node 20 以上版本。[前往官网下载](https://nodejs.org/)
2.  **Rust**: 请安装 Rust 的包管理器 Cargo。[前往官网下载安装](https://rustup.rs/)

*(如果你在 Linux 上，可能还需要安装基础的编译依赖，比如 `sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`)*

### 2. 获取代码与安装依赖

打开你的终端（Windows下推荐用 PowerShell 或 Git Bash，Mac/Linux 下直接打开 Terminal）。

1.  进入项目目录：
    ```bash
    cd Obsidian-attachments-voyager
    ```

2.  安装系统依赖并构建前端（这会下载 React 和 Tauri 相关的配套工具）：
    ```bash
    npm install
    ```

### 3. 开发环境预览 (仅调试)

如果你想在不打包成应用程序的情况下，边改代码边看效果，直接运行：
```bash
npm run tauri:dev
```
这会弹出一个开发窗口，你能在里面实时看到代码修改的效果。

---

## 📦 如何打包成可安装的应用程序？(生成 exe/dmg/deb)

这是最激动人心的一步！Tauri 的规则是：**你在什么系统上执行打包命令，就会生成对应系统的安装包。**
(例如：你在 Linux 上敲命令，绝对生不出 Windows 的 .exe；你想打 Windows 包，就必须在 Windows 电脑上敲命令。)

### 打包命令
在你刚刚的终端里，执行魔法指令：

```bash
npm run tauri:build
```

**第一次运行可能需要较长的时间**（喝杯咖啡吧），因为底层的 Rust 会去下载和编译大约 100 多个底层的系统连接库（crates）。只要不报错，出现像 `Compiling ...` 这样的字眼，就说明在顺利进行中！

当屏幕最后显示 `Finished release [optimized] target(s)` 时，恭喜你，打包大功告成！🎉

---

## 🎁 去哪里取我编译出来的物品？

打包成功后，安装包会默默躺在项目的深处。请按照你的操作系统去以下路径寻找你的“战利品”：

### 🪟 如果你是 Windows 用户：
编译完成后，你的安装包在这个目录里：
*   👉 `src-tauri/target/release/bundle/nsis/`

你可以直接进入 `src-tauri/target/release/` 找到绿色免安装版的 `obsidian-attachments-voyager.exe` 直接双击使用！

如果你需要将它打包分享给别人安装：
*   它的默认安装包可能生成在 `src-tauri/target/release/bundle/msi/` (形如 `.msi` 安装包)
*   或者 `src-tauri/target/release/bundle/nsis/` (形如 `-setup.exe` 的安装向导)
这两个都可以完美运行，里面已经包含了断开网络后能正常渲染的前端页面。

### 🍎 如果你是 macOS 用户：
编译完成后，你的安装包在这个目录里：
*   👉 `src-tauri/target/release/bundle/dmg/`

你会看到一个形如 `obsidian-attachments-voyager_0.1.0_x64.dmg` 的苹果磁盘映像，或者在 `bundle/macos/` 下找到可以直接拖进应用程序的 `.app` 文件。

### 🐧 如果你是 Linux 用户（比如在 Docker 或 WSL 容器内）：
由于我们在 `tauri.conf.json` 中临时关闭了 bundle（为了避开纯净容器中缺少桌面图标组件的校验报错），目前默认只会生成一个绿色的可执行二进制文件。

你的可执行程序就在这里：
*   👉 `src-tauri/target/release/obsidian-attachments-voyager`

（这是一个没有后缀名的 ELF 二进制文件，在 Linux 桌面或命令行直接 `./obsidian-attachments-voyager` 就能跑起来！）

*(提示：如果你想要产生 `.deb` 或 `.AppImage` 安装包，只需在 `src-tauri/tauri.conf.json` 中把 `"bundle": { "active": false }` 改回为 `"active": true`，但请确保你的 Linux 系统下配有完整的系统图标开发支持环境变量。)*

---

## ⚠️ 常见排错锦囊 (Troubleshooting)

*   **报错 `failed to get cargo metadata: No such file or directory (os error 2)` (仅 Linux 环境常见)**
    *   **原因**：你在纯 Docker/无头 Linux 环境中执行 `npm run tauri:build` 时，终端可能没加载 `cargo` 的环境变量，导致 Node 找不到 Rust 编译器。
    *   **解决**：只需手动显式注入环境变量后再跑一遍构建即可。在 Linux 里执行：`PATH=$HOME/.cargo/bin:$PATH npm run tauri:build`。**(强烈提醒：如果你在 Windows/Mac 等本地有完整开发环境的机器上，绝不需要这一步！直接跑 `npm run tauri:build` 即可，Windows 下强行加 PATH=$HOME 属 Linux 语法，反而会导致 PowerShell 卡死！)**

*   **报错 `Error failed to build app: failed to build app`，往上看有一句 `EOF related to icons 32x32.png`**
    *   **原因**：我们在绕过图标设置时，`icons` 里的文件是空的（0字节）。Tauri 读取不到真实图片就会报错。
    *   **解决**：本版本已经将 `src-tauri/tauri.conf.json` 中的 `"icon": []` 清空并跳过检查。如果以后你要正式发布，请放几张符合规范（32x32, 128x128）的真实 `.png` 以及 `.ico` 图片到 `icons` 目录，并在配置文件里重新把它配上去！

*   **(小白切记)不要在 Linux 容器里问为什么找不到 `.exe`！**
    *   想要 `.exe`，请把本文件夹整个拷贝到一台完整的 Windows 电脑上，装好 Node 和 Rust，然后在 Windows 里敲下 `npm run tauri:build`！

---
Enjoy your Obsidian managing journey! 🚀