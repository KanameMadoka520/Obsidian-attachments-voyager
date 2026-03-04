# Obsidian Attachments Voyager 白屏问题诊断设计

> 设计日期：2026-03-03
> 项目：Obsidian-attachments-voyager

## 背景

当前问题为：`tauri dev` 下 UI 正常，但 `tauri build` 后的 Windows 安装产物打开为空白页，并报 `localhost refused to connect (ERR_CONNECTION_REFUSED)`。

已确认：
- 前端 `dist` 能正常生成（`dist/index.html` 与 `dist/assets/*.js` 存在）。
- 打包流程能完成 NSIS/MSI 产物。
- 参考可运行项目与当前项目存在关键差异：`src-tauri/Cargo.toml` 的 `custom-protocol` feature 配置不同。

## 目标

在不盲目改配置的前提下，先获得可证据化的运行时信息，明确失败发生在以下哪层：
1. 资源存在性与路径层。
2. Tauri release 资源协议链路层（custom protocol）。
3. WebView 启动与页面加载层。

## 非目标

- 不进行与问题无关的重构。
- 不先行大改打包架构。
- 不在证据不足时并行修改多个变量。

## 诊断方案（最小侵入）

### 1) Release 启动诊断日志

在 `src-tauri/src/main.rs` 增加最小诊断逻辑（只读，不改变业务行为）：
- 记录构建模式：`debug/release`。
- 记录 `current_exe` 与 `current_dir`。
- 探测关键候选路径/资源痕迹（例如 `resources`、`dist`、`index.html`）。
- 记录窗口创建流程关键事件（开始创建、创建成功/失败）。

日志输出到本地可读文件（Windows 下用户可定位目录），用于复现后比对。

### 2) 单变量修复策略

基于诊断结果按顺序执行：
1. 若表现为协议链路异常/回退 localhost：优先最小修复
   - `src-tauri/Cargo.toml`
   - `custom-protocol = ["tauri/custom-protocol"]`
2. 若表现为资源路径装载问题：再调整 `distDir` 流程（第二步）。
3. 若两者均异常：每次只改一处，逐步复验。

## 验收标准

修复后必须同时满足：
1. `npm run tauri:build` 成功。
2. 安装产物启动后不再出现 `localhost refused`。
3. UI 可正常渲染。
4. 诊断日志能解释“为何失败”与“为何修复有效”。

## 风险与回滚

- 风险：诊断日志不足以覆盖全部边界。
- 控制：先做只读日志，再做单变量修复。
- 回滚：所有改动保持最小粒度，若修复无效可快速回退到前一状态并保留日志证据。
