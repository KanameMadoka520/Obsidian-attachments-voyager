# Expanded UX + Operations Design (2026-03-03)

## Goal
一次性落地高级功能：全局缩放/字体持久化、工作原理说明、双通道日志（UI + exe旁文件）、双层撤回（任务级 + 文件级）、冲突策略选择、扫描结果快捷打开文件/目录、最近仓库路径持久化。

## Confirmed Constraints
- 冲突默认策略：**改名共存**。
- 同时支持三种冲突处理方式：
  1. 每次冲突弹框选择
  2. 后续全部覆盖
  3. 后续全部改名共存
- 撤回模式：**任务级 + 文件级都支持**。
- 任务级撤回时忽略已被单文件撤回的条目。
- 撤回找不到目标文件时提示：`无法找到该文件，请自行检查`。
- 字体/缩放：**全局生效 + 持久化 + 恢复默认按钮**。

## Architecture

### 1) Unified Operation Engine (Rust)
建立统一操作记录模型，覆盖“迁移”“修复”两类动作。

核心对象：
- `OperationTask`: 一次自动化任务（taskId, type, timestamp, policy, status）。
- `OperationEntry`: 单文件操作记录（entryId, source, target, action, status, undo_status）。
- `ConflictPolicy`: `PromptEach | OverwriteAll | RenameAll`。

执行后输出：
- 前端可消费的结构化结果（含 taskId/entries/summary）。
- 同步写操作日志，供历史列表与撤回使用。

### 2) Dual-layer Undo
- `undo_task(taskId)`：按逆序回滚可撤回条目。
- `undo_entry(entryId)`：仅回滚单条。

规则实现：
- 若 entry 已执行过单独撤回，则任务级撤回跳过。
- 若撤回目标缺失，返回明确失败项并包含用户提示文本。

### 3) Conflict Handling
统一封装冲突处理函数：
- `OverwriteAll`: 覆盖写入。
- `RenameAll`: 自动改名共存（如 `name (1).ext`）。
- `PromptEach`: 返回待决冲突，让前端弹窗决策并继续执行。

### 4) Logging Model
双轨日志：
- UI 日志流：用于“工作日志窗口”。
- 文件日志：优先写 exe 同目录（调试友好）。

日志最小字段：
- timestamp, taskId, action, source, target, result, message。

### 5) Frontend State & Persistence
在 App 层建立全局 UI 设置状态（localStorage）：
- fontScale
- zoomScale
- conflictDefaultPolicy
- recentVaultPaths

页面共享：
- Scan/Migrate 复用设置。
- 提供“恢复默认”入口。

## UI/UX Sections
1. 顶栏新增“显示设置”：字体、缩放、恢复默认。
2. Scan/Migrate 各自增加“工作原理说明”折叠区。
3. 增加“工作日志”窗口与“操作历史”窗口。
4. 扫描结果项增加：打开文件、打开所在目录。
5. 仓库路径输入增加最近路径下拉与一键回填。
6. 冲突弹窗支持切换后续策略（一次性/持续策略）。

## API Surface (planned)
- `scan_vault(root)`
- `execute_migration(notePath, targetDir, policy)`
- `fix_issues(issues, policy)`
- `list_operation_history()`
- `undo_task(taskId)`
- `undo_entry(entryId)`
- `open_file(path)`
- `open_file_parent(path)`
- `get_runtime_logs(limit)`

## Acceptance Criteria
1. 缩放和字体全局可调，重启后保留，恢复默认可用。
2. 两个主模块都展示工作原理说明。
3. 日志窗口可见实时记录，同时 exe 旁有日志文件。
4. 历史可执行任务级撤回和单文件撤回。
5. 任务级撤回自动跳过已单独撤回文件。
6. 找不到撤回目标时出现明确提示文本。
7. 冲突策略默认改名共存，并支持三模式切换。
8. 扫描结果支持打开文件与打开所在目录。
9. 最近仓库路径可记忆并快速复用。
