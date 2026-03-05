export type Lang = 'zh' | 'en'

export interface Translations {
  // TitleBar - tabs
  tabScan: string
  tabMigrate: string
  tabStats: string
  // TitleBar - theme
  themeAuto: string
  themeLight: string
  themeDark: string
  themeParchment: string
  themeAriaLabel: string
  // TitleBar - window controls
  minimize: string
  restore: string
  maximize: string
  close: string
  // TitleBar - language toggle
  langToggle: string

  // Sidebar - category
  sidebarCategory: string
  sidebarOrphanTooltip: string
  sidebarMisplacedTooltip: string
  // Sidebar - search
  sidebarSearch: string
  sidebarSearchPlaceholder: string
  // Sidebar - file type
  sidebarFileType: string
  sidebarFileTypeOther: string
  // Sidebar - size filter
  sidebarFileSize: string
  sidebarSizeAll: string

  // Toolbar
  toolbarVaultPlaceholder: string
  toolbarVaultAriaLabel: string
  toolbarPick: string
  toolbarScanning: string
  toolbarScan: string
  toolbarThumbnail: string
  toolbarThumbnailTooltip: string
  toolbarDisplayThumbnail: string
  toolbarDisplayRawImage: string
  toolbarDisplayNoImage: string
  toolbarRawImageTooltip: string
  toolbarSelectAll: string
  toolbarClearSelection: string
  toolbarFix: string
  toolbarFixWithCount: string
  toolbarFixTooltip: string
  toolbarExport: string

  // ProgressBar
  progressPreparing: string
  progressCollecting: string
  progressParsing: string
  progressThumbnails: string

  // StatusBar
  statusSelected: string
  statusLogs: string
  statusHistory: string
  statusClearThumbnailCache: string
  statusNoLogs: string
  statusNoHistory: string
  statusTaskTypeFix: string
  statusTaskTypeMigration: string
  statusApplied: string
  statusFailed: string
  statusSkipped: string
  statusActionMove: string
  statusActionDelete: string

  // ConfirmDialog
  confirmDefaultTitle: string
  confirmDefaultBody: string
  confirmOk: string
  confirmCancel: string

  // DetailPanel
  detailMultiSelect: string
  detailFileName: string
  detailPath: string
  detailType: string
  detailReason: string
  detailSuggestedTarget: string
  detailRefNote: string
  detailOpenFile: string
  detailOpenFolder: string
  detailFullscreen: string

  // GalleryCard
  galleryNoImage: string
  galleryLoading: string
  galleryLoadFailed: string
  galleryThumbLoadFailed: string
  galleryNoThumb: string
  gallerySuggestedPath: string

  // IssuesTable
  issuesColSelect: string
  issuesColPreview: string
  issuesColImagePath: string
  issuesColSuggestedPath: string
  issuesColRefMarkdown: string
  issuesColActions: string
  issuesEmpty: string
  issuesNoPreview: string
  issuesOpenImageFile: string
  issuesOpenImageFolder: string
  issuesOpenMarkdownFile: string
  issuesOpenMarkdownFolder: string
  issuesTrashDeleteSelected: string
  issuesTrashDeleteChange: string

  // OperationHistoryPanel
  operationHistoryTitle: string
  operationHistoryCollapse: string
  operationHistoryExpand: string
  operationHistoryEmpty: string

  // WorkLogPanel
  workLogTitle: string
  workLogCollapse: string
  workLogExpand: string
  workLogEmpty: string

  // MigratePlanTable
  migratePlanTitle: string
  migratePlanColMapping: string
  migratePlanEmpty: string

  // ScanPage
  scanErrorNoVault: string
  scanErrorFailed: string
  scanFixComplete: string
  scanFixFailed: string
  scanErrorNoSelection: string
  scanStaleResult: string
  scanConfirmTitle: string
  scanConfirmTitleFixing: string
  scanConfirmBody1: string
  scanConfirmBody2: string
  scanConflictPrompt: string
  scanClearCacheConfirm: string
  scanClearCacheConfirmTitle: string
  scanClearCacheConfirmBody: string
  scanClearCacheNote: string
  scanClearCacheDone: string
  scanExportDone: string
  scanExportFailed: string
  scanCtxOpenFile: string
  scanCtxOpenFolder: string
  scanCtxCopyPath: string
  scanCtxFullscreen: string
  scanCtxDeselect: string
  scanCtxSelect: string
  scanPreviewFit: string
  scanPreviewHint: string
  scanPreviewOpenFile: string
  scanPreviewOpenFolder: string
  scanPreviewFullscreenRaw: string
  scanPreviewResetZoom: string
  scanPreviewOriginalSize: string
  scanPreviewCancel: string
  scanPreviewLoadFailed: string
  scanFsAdaptive: string
  scanFsHint: string
  scanFsExitFullscreen: string
  scanPrevImage: string
  scanNextImage: string

  // MigratePage
  migrateConfigTitle: string
  migrateSelectNote: string
  migrateNotePlaceholder: string
  migrateTargetDir: string
  migrateTargetPlaceholder: string
  migratePickDir: string
  migratePreviewPlan: string
  migrateExecuting: string
  migrateExecute: string
  migrateNoPathError: string
  migratePreviewGenerated: string
  migrateNoPreviewError: string
  migrateComplete: string
  migrateFailed: string
  migrateConflictPrompt: string
  migrateExplainTitle: string
  migrateExplainBody: string

  // StatsPage
  statsNoData: string
  statsOverview: string
  statsTotalMd: string
  statsTotalImages: string
  statsIssueCount: string
  statsOrphanMisplaced: string
  statsIssueTypeDist: string
  statsFileTypeDist: string
  statsFileSizeDist: string
  statsTopDirs: string
  statsTimeDist: string
  statsNoTimeData: string
  statsDuplicateFiles: string
  statsDupFileName: string
  statsDupSize: string
  statsDupCount: string
  statsDupPaths: string
  statsNoDuplicates: string

  // Export (Markdown report)
  exportReportTitle: string
  exportReportSummary: string
  exportColType: string
  exportColImagePath: string
  exportColSize: string
  exportColReason: string
  exportColSuggestedTarget: string
  exportTypeOrphan: string
  exportTypeMisplaced: string
}

const zh: Translations = {
  // TitleBar - tabs
  tabScan: '附件扫描',
  tabMigrate: '联动迁移',
  tabStats: '统计',
  // TitleBar - theme
  themeAuto: '跟随系统',
  themeLight: '亮色',
  themeDark: '暗色',
  themeParchment: '羊皮纸',
  themeAriaLabel: '主题',
  // TitleBar - window controls
  minimize: '最小化',
  restore: '还原',
  maximize: '最大化',
  close: '关闭',
  // TitleBar - language toggle
  langToggle: 'EN',

  // Sidebar
  sidebarCategory: '分类',
  sidebarOrphanTooltip: '孤立附件：没有被任何 Markdown 文件引用的图片。修复操作会将其删除。',
  sidebarMisplacedTooltip: '错位附件：图片未存放在引用它的 Markdown 文件所在的附件目录中。修复操作会将图片移动到正确位置，并自动更新 Markdown 中的引用链接。',
  sidebarSearch: '搜索',
  sidebarSearchPlaceholder: '文件名 / 路径...',
  sidebarFileType: '文件类型',
  sidebarFileTypeOther: '其他',
  sidebarFileSize: '文件大小',
  sidebarSizeAll: '全部',

  // Toolbar
  toolbarVaultPlaceholder: '仓库路径...',
  toolbarVaultAriaLabel: '仓库路径',
  toolbarPick: '选择',
  toolbarScanning: '扫描中...',
  toolbarScan: '扫描',
  toolbarThumbnail: '缩略图',
  toolbarThumbnailTooltip: '勾选后扫描时会生成三级缩略图缓存（64px / 256px / 1024px），用于画廊展示和预览弹窗。生成缩略图会降低扫描速度，但后续浏览性能更好。取消勾选则跳过生成，画廊使用原图或不显示图片。',
  toolbarDisplayThumbnail: '缩略',
  toolbarDisplayRawImage: '原图',
  toolbarDisplayNoImage: '无图',
  toolbarRawImageTooltip: '原图模式直接加载完整图片文件，虽然使用了懒加载（lazy loading）优化，但当图片数量较多或单张体积较大时，仍可能导致内存占用过高、界面卡顿等性能问题。建议优先使用缩略图模式浏览。',
  toolbarSelectAll: '全选',
  toolbarClearSelection: '清空',
  toolbarFix: '修复',
  toolbarFixWithCount: '修复 ({count})',
  toolbarFixTooltip: '对选中的问题执行修复：Orphan（孤立附件）将被删除；Misplaced（错位附件）将被移动到正确的附件目录，同时自动更新 Markdown 中的引用链接。所有操作均可在操作历史中撤回。',
  toolbarExport: '导出 ▾',

  // ProgressBar
  progressPreparing: '准备扫描...',
  progressCollecting: '收集文件中...',
  progressParsing: '解析 Markdown...',
  progressThumbnails: '生成缩略图...',

  // StatusBar
  statusSelected: '已选: {selected}/{total}',
  statusLogs: '日志',
  statusHistory: '操作历史 ({count})',
  statusClearThumbnailCache: '清除缩略图缓存',
  statusNoLogs: '暂无日志',
  statusNoHistory: '暂无操作历史',
  statusTaskTypeFix: '修复',
  statusTaskTypeMigration: '迁移',
  statusApplied: '已执行',
  statusFailed: '失败',
  statusSkipped: '跳过',
  statusActionMove: '移动',
  statusActionDelete: '删除',

  // ConfirmDialog
  confirmDefaultTitle: '确认',
  confirmDefaultBody: '您确定要执行此操作吗？目前此操作属于破坏性操作，可能会移动或删除您本地的文件。请确认您已进行了备份。',
  confirmOk: '确认执行',
  confirmCancel: '取消',

  // DetailPanel
  detailMultiSelect: '已选择 {count} 张图片',
  detailFileName: '文件名',
  detailPath: '路径',
  detailType: '类型',
  detailReason: '原因',
  detailSuggestedTarget: '建议目标',
  detailRefNote: '引用笔记',
  detailOpenFile: '打开文件',
  detailOpenFolder: '打开目录',
  detailFullscreen: '全屏查看',

  // GalleryCard
  galleryNoImage: '不显示图片',
  galleryLoading: '加载中...',
  galleryLoadFailed: '图片加载失败',
  galleryThumbLoadFailed: '缩略图加载失败',
  galleryNoThumb: '未生成缩略图',
  gallerySuggestedPath: '建议路径：{path}',

  // IssuesTable
  issuesColSelect: '选择',
  issuesColPreview: '预览',
  issuesColImagePath: '图片路径',
  issuesColSuggestedPath: '建议路径',
  issuesColRefMarkdown: '引用 Markdown',
  issuesColActions: '操作',
  issuesEmpty: '当前类型暂无问题',
  issuesNoPreview: '无',
  issuesOpenImageFile: '图片-打开文件',
  issuesOpenImageFolder: '图片-打开目录',
  issuesOpenMarkdownFile: 'Markdown-打开文件',
  issuesOpenMarkdownFolder: 'Markdown-打开目录',
  issuesTrashDeleteSelected: '已选：删除图片',
  issuesTrashDeleteChange: '改为删除图片',

  // OperationHistoryPanel
  operationHistoryTitle: '操作历史',
  operationHistoryCollapse: '收起',
  operationHistoryExpand: '展开',
  operationHistoryEmpty: '暂无历史操作',

  // WorkLogPanel
  workLogTitle: '工作日志',
  workLogCollapse: '收起',
  workLogExpand: '展开',
  workLogEmpty: '暂无日志',

  // MigratePlanTable
  migratePlanTitle: '迁移预览视图',
  migratePlanColMapping: '迁移指令路径映射',
  migratePlanEmpty: '尚无生成的迁移计划，请先配置路径并点击预览',

  // ScanPage
  scanErrorNoVault: '请先选择仓库路径',
  scanErrorFailed: '扫描失败',
  scanFixComplete: '修复完成：移动 {moved}，删除 {deleted}，跳过 {skipped}',
  scanFixFailed: '修复失败：{message}',
  scanErrorNoSelection: '请先选择要修复的文件',
  scanStaleResult: '当前展示的是上次的扫描结果。如果仓库内容已发生变化，建议重新扫描。',
  scanConfirmTitle: '确认执行修复',
  scanConfirmTitleFixing: '执行中，请稍候...',
  scanConfirmBody1: '执行后无法恢复，请确认要执行。',
  scanConfirmBody2: '如果有图片需要备份请自行备份（后续可能开发一键备份选中图片出来的功能）。',
  scanConflictPrompt: '检测到重名冲突。确定选择"覆盖"吗？取消将使用"改名共存"。',
  scanClearCacheConfirm: '将删除画廊缩略图缓存（.voyager-gallery-cache）下的所有文件，确定继续吗？',
  scanClearCacheConfirmTitle: '确认清除缩略图缓存',
  scanClearCacheConfirmBody: '将删除画廊缩略图缓存（.voyager-gallery-cache）下的所有文件。下次扫描时会重新生成。',
  scanClearCacheNote: '提示：每张图片会生成 3 个不同尺寸的缩略图（64px / 256px / 1024px），因此缩略图总数 ÷ 3 = 实际图片数量。',
  scanClearCacheDone: '清除完成：已删除 {removed} 个缩略图文件（约 {realCount} 张图片的缓存），路径：{cacheDir}',
  scanExportDone: '导出完成：{path}',
  scanExportFailed: '导出失败：{message}',
  scanCtxOpenFile: '打开文件',
  scanCtxOpenFolder: '打开目录',
  scanCtxCopyPath: '复制路径',
  scanCtxFullscreen: '全屏查看',
  scanCtxDeselect: '取消选中',
  scanCtxSelect: '选中',
  scanPreviewFit: '自适应',
  scanPreviewHint: '滚轮缩放 / 点击切换 / 拖拽平移',
  scanPreviewOpenFile: '打开文件',
  scanPreviewOpenFolder: '打开目录',
  scanPreviewFullscreenRaw: '全屏原图',
  scanPreviewResetZoom: '重置缩放',
  scanPreviewOriginalSize: '100% 原始尺寸',
  scanPreviewCancel: '取消',
  scanPreviewLoadFailed: '无法加载图片',
  scanFsAdaptive: '自适应',
  scanFsHint: '滚轮缩放 / 点击切换 / 拖拽平移 / 方向键切换',
  scanFsExitFullscreen: '退出全屏 (ESC)',
  scanPrevImage: '上一张',
  scanNextImage: '下一张',

  // MigratePage
  migrateConfigTitle: '迁移配置',
  migrateSelectNote: '选择笔记',
  migrateNotePlaceholder: '输入或选择要迁移的笔记路径...',
  migrateTargetDir: '目标目录',
  migrateTargetPlaceholder: '输入或选择目标目录...',
  migratePickDir: '选择目录',
  migratePreviewPlan: '预览迁移计划',
  migrateExecuting: '执行中...',
  migrateExecute: '执行迁移',
  migrateNoPathError: '请先填写笔记路径和目标目录',
  migratePreviewGenerated: '已生成迁移预览',
  migrateNoPreviewError: '请先生成迁移预览再执行',
  migrateComplete: '迁移完成：task={taskId}，笔记 {movedNotes}，附件 {movedAssets}',
  migrateFailed: '迁移失败：{message}',
  migrateConflictPrompt: '检测到重名冲突。确定选择"覆盖"吗？取消将使用"改名共存"。',
  migrateExplainTitle: '工作原理说明（联动迁移）',
  migrateExplainBody: '联动迁移会把笔记与其关联附件按目标目录一起迁移，并在冲突时根据策略（弹窗/覆盖/改名共存）处理同名文件。',

  // StatsPage
  statsNoData: '请先在「附件扫描」页面执行扫描',
  statsOverview: '仓库总览',
  statsTotalMd: '总 Markdown 文件',
  statsTotalImages: '总图片文件',
  statsIssueCount: '问题数',
  statsOrphanMisplaced: '孤立/错位',
  statsIssueTypeDist: '问题类型分布',
  statsFileTypeDist: '文件类型分布',
  statsFileSizeDist: '文件大小分布',
  statsTopDirs: '问题目录 Top 10',
  statsTimeDist: '文件时间分布',
  statsNoTimeData: '暂无时间数据',
  statsDuplicateFiles: '重复文件检测',
  statsDupFileName: '文件名',
  statsDupSize: '大小',
  statsDupCount: '数量',
  statsDupPaths: '路径列表',
  statsNoDuplicates: '未检测到重复文件',

  // Export
  exportReportTitle: 'Voyager 扫描报告',
  exportReportSummary: '共 {count} 个问题',
  exportColType: '类型',
  exportColImagePath: '图片路径',
  exportColSize: '大小',
  exportColReason: '原因',
  exportColSuggestedTarget: '建议目标',
  exportTypeOrphan: '孤立',
  exportTypeMisplaced: '错位',
}

const en: Translations = {
  // TitleBar - tabs
  tabScan: 'Scan',
  tabMigrate: 'Migrate',
  tabStats: 'Stats',
  // TitleBar - theme
  themeAuto: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeParchment: 'Parchment',
  themeAriaLabel: 'Theme',
  // TitleBar - window controls
  minimize: 'Minimize',
  restore: 'Restore',
  maximize: 'Maximize',
  close: 'Close',
  // TitleBar - language toggle
  langToggle: '中文',

  // Sidebar
  sidebarCategory: 'Category',
  sidebarOrphanTooltip: 'Orphan attachments: images not referenced by any Markdown file. Fixing will delete them.',
  sidebarMisplacedTooltip: 'Misplaced attachments: images not stored in the attachment directory of the Markdown file that references them. Fixing will move images to the correct location and update Markdown references automatically.',
  sidebarSearch: 'Search',
  sidebarSearchPlaceholder: 'Filename / path...',
  sidebarFileType: 'File Type',
  sidebarFileTypeOther: 'Other',
  sidebarFileSize: 'File Size',
  sidebarSizeAll: 'All',

  // Toolbar
  toolbarVaultPlaceholder: 'Vault path...',
  toolbarVaultAriaLabel: 'Vault path',
  toolbarPick: 'Browse',
  toolbarScanning: 'Scanning...',
  toolbarScan: 'Scan',
  toolbarThumbnail: 'Thumbnails',
  toolbarThumbnailTooltip: 'When enabled, scanning generates three-tier thumbnail caches (64px / 256px / 1024px) for gallery display and preview popups. Generating thumbnails slows down scanning but improves browsing performance. Disable to skip generation; gallery will use raw images or show no image.',
  toolbarDisplayThumbnail: 'Thumb',
  toolbarDisplayRawImage: 'Raw',
  toolbarDisplayNoImage: 'None',
  toolbarRawImageTooltip: 'Raw image mode loads full image files directly. Despite lazy loading optimizations, when there are many images or large file sizes, this may cause high memory usage and UI lag. It is recommended to use thumbnail mode for browsing.',
  toolbarSelectAll: 'Select All',
  toolbarClearSelection: 'Clear',
  toolbarFix: 'Fix',
  toolbarFixWithCount: 'Fix ({count})',
  toolbarFixTooltip: 'Fix selected issues: Orphan attachments will be deleted; Misplaced attachments will be moved to the correct directory, and Markdown references will be updated automatically. All operations can be reviewed in operation history.',
  toolbarExport: 'Export ▾',

  // ProgressBar
  progressPreparing: 'Preparing scan...',
  progressCollecting: 'Collecting files...',
  progressParsing: 'Parsing Markdown...',
  progressThumbnails: 'Generating thumbnails...',

  // StatusBar
  statusSelected: 'Selected: {selected}/{total}',
  statusLogs: 'Logs',
  statusHistory: 'History ({count})',
  statusClearThumbnailCache: 'Clear Thumbnail Cache',
  statusNoLogs: 'No logs yet',
  statusNoHistory: 'No operation history',
  statusTaskTypeFix: 'Fix',
  statusTaskTypeMigration: 'Migration',
  statusApplied: 'Applied',
  statusFailed: 'Failed',
  statusSkipped: 'Skipped',
  statusActionMove: 'Move',
  statusActionDelete: 'Delete',

  // ConfirmDialog
  confirmDefaultTitle: 'Confirm',
  confirmDefaultBody: 'Are you sure you want to proceed? This is a destructive operation that may move or delete local files. Please make sure you have a backup.',
  confirmOk: 'Confirm',
  confirmCancel: 'Cancel',

  // DetailPanel
  detailMultiSelect: '{count} images selected',
  detailFileName: 'Filename',
  detailPath: 'Path',
  detailType: 'Type',
  detailReason: 'Reason',
  detailSuggestedTarget: 'Suggested Target',
  detailRefNote: 'Referencing Note',
  detailOpenFile: 'Open File',
  detailOpenFolder: 'Open Folder',
  detailFullscreen: 'Fullscreen',

  // GalleryCard
  galleryNoImage: 'No image',
  galleryLoading: 'Loading...',
  galleryLoadFailed: 'Image load failed',
  galleryThumbLoadFailed: 'Thumbnail load failed',
  galleryNoThumb: 'No thumbnail',
  gallerySuggestedPath: 'Suggested: {path}',

  // IssuesTable
  issuesColSelect: 'Select',
  issuesColPreview: 'Preview',
  issuesColImagePath: 'Image Path',
  issuesColSuggestedPath: 'Suggested Path',
  issuesColRefMarkdown: 'Referencing Markdown',
  issuesColActions: 'Actions',
  issuesEmpty: 'No issues in this category',
  issuesNoPreview: 'N/A',
  issuesOpenImageFile: 'Image - Open File',
  issuesOpenImageFolder: 'Image - Open Folder',
  issuesOpenMarkdownFile: 'Markdown - Open File',
  issuesOpenMarkdownFolder: 'Markdown - Open Folder',
  issuesTrashDeleteSelected: 'Selected: Delete Image',
  issuesTrashDeleteChange: 'Switch to Delete Image',

  // OperationHistoryPanel
  operationHistoryTitle: 'Operation History',
  operationHistoryCollapse: 'Collapse',
  operationHistoryExpand: 'Expand',
  operationHistoryEmpty: 'No operation history',

  // WorkLogPanel
  workLogTitle: 'Work Log',
  workLogCollapse: 'Collapse',
  workLogExpand: 'Expand',
  workLogEmpty: 'No logs yet',

  // MigratePlanTable
  migratePlanTitle: 'Migration Preview',
  migratePlanColMapping: 'Migration Path Mapping',
  migratePlanEmpty: 'No migration plan generated yet. Please configure paths and click Preview.',

  // ScanPage
  scanErrorNoVault: 'Please select a vault path first',
  scanErrorFailed: 'Scan failed',
  scanFixComplete: 'Fix complete: moved {moved}, deleted {deleted}, skipped {skipped}',
  scanFixFailed: 'Fix failed: {message}',
  scanErrorNoSelection: 'Please select files to fix first',
  scanStaleResult: 'Showing results from the last scan. If vault contents have changed, re-scanning is recommended.',
  scanConfirmTitle: 'Confirm Fix',
  scanConfirmTitleFixing: 'Fixing, please wait...',
  scanConfirmBody1: 'This cannot be undone. Please confirm you want to proceed.',
  scanConfirmBody2: 'Please back up any images you need before proceeding (a one-click backup feature may be developed in the future).',
  scanConflictPrompt: 'Name conflict detected. Choose "Overwrite"? Cancel will use "Rename to coexist".',
  scanClearCacheConfirm: 'This will delete all files under the gallery thumbnail cache (.voyager-gallery-cache). Continue?',
  scanClearCacheConfirmTitle: 'Confirm Clear Thumbnail Cache',
  scanClearCacheConfirmBody: 'This will delete all files under the gallery thumbnail cache (.voyager-gallery-cache). They will be regenerated on the next scan.',
  scanClearCacheNote: 'Note: Each image generates 3 thumbnails at different sizes (64px / 256px / 1024px), so total thumbnails ÷ 3 = actual image count.',
  scanClearCacheDone: 'Cache cleared: {removed} thumbnail files deleted (approx. {realCount} images), path: {cacheDir}',
  scanExportDone: 'Export complete: {path}',
  scanExportFailed: 'Export failed: {message}',
  scanCtxOpenFile: 'Open File',
  scanCtxOpenFolder: 'Open Folder',
  scanCtxCopyPath: 'Copy Path',
  scanCtxFullscreen: 'Fullscreen',
  scanCtxDeselect: 'Deselect',
  scanCtxSelect: 'Select',
  scanPreviewFit: 'Fit',
  scanPreviewHint: 'Scroll to zoom / Click to toggle / Drag to pan',
  scanPreviewOpenFile: 'Open File',
  scanPreviewOpenFolder: 'Open Folder',
  scanPreviewFullscreenRaw: 'Fullscreen Raw',
  scanPreviewResetZoom: 'Reset Zoom',
  scanPreviewOriginalSize: '100% Original',
  scanPreviewCancel: 'Cancel',
  scanPreviewLoadFailed: 'Cannot load image',
  scanFsAdaptive: 'Fit',
  scanFsHint: 'Scroll to zoom / Click to toggle / Drag to pan / Arrow keys to navigate',
  scanFsExitFullscreen: 'Exit Fullscreen (ESC)',
  scanPrevImage: 'Previous',
  scanNextImage: 'Next',

  // MigratePage
  migrateConfigTitle: 'Migration Config',
  migrateSelectNote: 'Select Note',
  migrateNotePlaceholder: 'Enter or select the note path to migrate...',
  migrateTargetDir: 'Target Directory',
  migrateTargetPlaceholder: 'Enter or select target directory...',
  migratePickDir: 'Browse',
  migratePreviewPlan: 'Preview Plan',
  migrateExecuting: 'Executing...',
  migrateExecute: 'Execute Migration',
  migrateNoPathError: 'Please fill in both the note path and target directory',
  migratePreviewGenerated: 'Migration preview generated',
  migrateNoPreviewError: 'Please generate a migration preview before executing',
  migrateComplete: 'Migration complete: task={taskId}, notes {movedNotes}, attachments {movedAssets}',
  migrateFailed: 'Migration failed: {message}',
  migrateConflictPrompt: 'Name conflict detected. Choose "Overwrite"? Cancel will use "Rename to coexist".',
  migrateExplainTitle: 'How It Works (Linked Migration)',
  migrateExplainBody: 'Linked migration moves notes and their associated attachments to the target directory together, handling name conflicts according to the chosen policy (prompt / overwrite / rename to coexist).',

  // StatsPage
  statsNoData: 'Please run a scan on the "Scan" page first',
  statsOverview: 'Vault Overview',
  statsTotalMd: 'Total Markdown Files',
  statsTotalImages: 'Total Image Files',
  statsIssueCount: 'Issues',
  statsOrphanMisplaced: 'Orphan / Misplaced',
  statsIssueTypeDist: 'Issue Type Distribution',
  statsFileTypeDist: 'File Type Distribution',
  statsFileSizeDist: 'File Size Distribution',
  statsTopDirs: 'Top 10 Problem Directories',
  statsTimeDist: 'File Time Distribution',
  statsNoTimeData: 'No time data available',
  statsDuplicateFiles: 'Duplicate File Detection',
  statsDupFileName: 'Filename',
  statsDupSize: 'Size',
  statsDupCount: 'Count',
  statsDupPaths: 'Paths',
  statsNoDuplicates: 'No duplicate files detected',

  // Export
  exportReportTitle: 'Voyager Scan Report',
  exportReportSummary: '{count} issues total',
  exportColType: 'Type',
  exportColImagePath: 'Image Path',
  exportColSize: 'Size',
  exportColReason: 'Reason',
  exportColSuggestedTarget: 'Suggested Target',
  exportTypeOrphan: 'Orphan',
  exportTypeMisplaced: 'Misplaced',
}

const TRANSLATIONS: Record<Lang, Translations> = { zh, en }

export function t(lang: Lang, key: keyof Translations, vars?: Record<string, string | number>): string {
  let str = TRANSLATIONS[lang][key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}

export function getTranslations(lang: Lang): Translations {
  return TRANSLATIONS[lang]
}
