export type Lang = 'zh' | 'en'

export interface Translations {
  // TitleBar - tabs
  tabScan: string
  tabMigrate: string
  tabStats: string
  tabGallery: string
  tabHelp: string
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
  sidebarBrokenTooltip: string
  sidebarFilterGuide: string
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
  statusGuide: string

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
  detailMissingFilename: string
  detailOpenRefNote: string
  detailOpenRefNoteFolder: string
  detailEmptyGuide: string

  // GalleryCard
  galleryNoImage: string
  galleryLoading: string
  galleryLoadFailed: string
  galleryThumbLoadFailed: string
  galleryNoThumb: string
  gallerySuggestedPath: string
  galleryBrokenPlaceholder: string

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
  scanCtxOpenRefNote: string
  scanCtxOpenRefNoteFolder: string
  scanCtxRename: string
  scanRenameTitle: string
  scanRenameCurrentName: string
  scanRenameNewPlaceholder: string
  scanRenameAffectedMds: string
  scanRenameDone: string
  scanRenameFailed: string
  detailRename: string
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
  scanOverviewGuide: string

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
  migrateOverviewGuide: string
  migrateActionGuide: string

  // StatsPage
  statsNoData: string
  statsOverview: string
  statsTotalMd: string
  statsTotalImages: string
  statsIssueCount: string
  statsOrphanMisplaced: string
  statsOrphanMisplacedBroken: string
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
  statsOverviewGuide: string
  statsHealthGuide: string

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
  exportTypeBroken: string
  toolbarBackup: string
  toolbarBackupToDir: string
  toolbarBackupToZip: string
  scanBackupDone: string
  scanBackupFailed: string
  scanBackupNoSelection: string
  // GalleryPage
  galleryNoData: string
  gallerySummaryTotal: string
  gallerySummarySize: string
  galleryFormatBreakdown: string
  gallerySizeBreakdown: string
  galleryStatsTotal: string
  galleryStatsSize: string
  galleryStatsFiltered: string
  galleryGenerateThumbs: string
  galleryGenerateThumbsDesc: string
  galleryClearCache: string
  galleryClearCacheDesc: string
  galleryGenerating: string
  galleryGenerateDone: string
  galleryOverviewGuide: string
  galleryControlsGuide: string

  // Broken hint
  brokenHint: string

  // Backup All
  toolbarBackupAll: string
  toolbarBackupAllToDir: string
  toolbarBackupAllToZip: string

  // Duplicate Detection
  dupFindButton: string
  dupFinding: string
  dupTitle: string
  dupGroupCount: string
  dupKeepLabel: string
  dupMergeButton: string
  dupMerging: string
  dupMergeDone: string
  dupMergeFailed: string
  dupNoGroups: string
  dupRefCount: string
  dupConfirmTitle: string
  dupConfirmBody: string

  // Convert Format
  convertButton: string
  convertTitle: string
  convertTargetFormat: string
  convertQuality: string
  convertScope: string
  convertScopeAll: string
  convertScopeSelected: string
  convertScopeFormat: string
  convertExecute: string
  convertConverting: string
  convertDone: string
  convertFailed: string
  convertConfirmTitle: string
  convertConfirmBody: string

  // Health Score
  healthScoreTitle: string
  healthScoreLabel: string
  healthOrphanRate: string
  healthMisplacedRate: string
  healthBrokenRate: string

  // Drag-to-fix broken
  detailDropHint: string
  detailDropFixing: string
  detailDropFixDone: string
  detailDropFixFailed: string

  // Keyboard shortcuts
  shortcutSearchFocus: string

  // HelpPage
  helpTitle: string
  helpPrereqTitle: string
  helpPrereqIntro: string
  helpSettingAttachPath: string
  helpSettingAttachPathValue: string
  helpSettingAttachPathDesc: string
  helpSettingSubfolder: string
  helpSettingSubfolderDesc: string
  helpSettingLinkType: string
  helpSettingLinkTypeValue: string
  helpSettingLinkTypeDesc: string
  helpSettingWikiLink: string
  helpSettingWikiLinkValue: string
  helpSettingWikiLinkDesc: string
  helpSettingDelete: string
  helpSettingDeleteValue: string
  helpSettingDeleteDesc: string
  helpOverviewTitle: string
  helpOverviewBody: string
  helpScanTitle: string
  helpScanBody: string
  helpGalleryTitle: string
  helpGalleryBody: string
  helpStatsTitle: string
  helpStatsBody: string
  helpWorkflowsTitle: string
  helpWorkflowScan: string
  helpWorkflowBroken: string
  helpWorkflowBackup: string
  helpWorkflowDedup: string
  helpWorkflowConvert: string
  helpShortcutsTitle: string
  helpShortcutSearch: string
  helpShortcutDelete: string
  helpShortcutSelectAll: string
  helpShortcutEscape: string
}

const zh: Translations = {
  // TitleBar - tabs
  tabScan: '附件问题扫描',
  tabMigrate: '联动迁移',
  tabStats: '统计',
  tabGallery: '附件总览',
  tabHelp: '说明',
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
  sidebarBrokenTooltip: '断链附件：Markdown 文件引用了一个在磁盘上不存在的图片文件。需要手动补充缺失的文件。',
  sidebarFilterGuide: '左侧用于缩小当前结果范围：先按问题类型切换，再结合搜索、文件类型和大小筛选定位目标。',
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
  toolbarFixTooltip: '对选中的问题执行修复：Orphan（孤立附件）将被删除；Misplaced（错位附件）将被移动到正确的附件目录，同时自动更新 Markdown 中的引用链接。Broken（断链附件）无法自动修复，将被跳过——请手动补充缺失文件。',
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
  statusGuide: '日志用于查看本次运行过程，操作历史用于回看已经执行过的修复、备份、迁移或转换结果。',

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
  detailMissingFilename: '缺失文件名',
  detailOpenRefNote: '打开引用笔记',
  detailOpenRefNoteFolder: '打开笔记目录',
  detailEmptyGuide: '选中一个问题后，可在这里查看预览、路径、原因和可执行操作。',

  // GalleryCard
  galleryNoImage: '不显示图片',
  galleryLoading: '加载中...',
  galleryLoadFailed: '图片加载失败',
  galleryThumbLoadFailed: '缩略图加载失败',
  galleryNoThumb: '未生成缩略图',
  gallerySuggestedPath: '建议路径：{path}',
  galleryBrokenPlaceholder: '文件不存在',

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
  scanCtxOpenRefNote: '打开引用笔记',
  scanCtxOpenRefNoteFolder: '打开笔记目录',
  scanCtxRename: '重命名',
  scanRenameTitle: '重命名图片',
  scanRenameCurrentName: '当前文件名',
  scanRenameNewPlaceholder: '输入新文件名...',
  scanRenameAffectedMds: '将更新 {count} 个 Markdown 文件的引用',
  scanRenameDone: '重命名完成：已更新 {count} 个 MD 文件',
  scanRenameFailed: '重命名失败：{message}',
  detailRename: '重命名',
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
  scanOverviewGuide: '这是主工作台：先选择仓库并开始扫描，再按类型筛选结果，最后查看详情并执行修复、备份、去重、转格式或导出。',

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
  migrateOverviewGuide: '此页面适合整理目录结构：先指定笔记和目标目录，再预览迁移计划，确认无误后执行。',
  migrateActionGuide: '建议先预览再执行。预览只展示即将发生的路径变化，执行迁移才会真正改动文件。',

  // StatsPage
  statsNoData: '请先在「附件扫描」页面执行扫描',
  statsOverview: '仓库总览',
  statsTotalMd: '总 Markdown 文件',
  statsTotalImages: '总图片文件',
  statsIssueCount: '问题数',
  statsOrphanMisplaced: '孤立/错位',
  statsOrphanMisplacedBroken: '孤立/错位/断链',
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
  statsOverviewGuide: '统计页基于最近一次扫描结果生成，用来快速了解仓库中的问题数量、分布、热点目录和健康评分。',
  statsHealthGuide: '健康分越高，说明当前仓库中的孤立、错位和断链问题越少。如果刚处理过文件，建议重新扫描后再看统计。',

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
  exportTypeBroken: '断链',
  toolbarBackup: '备份 ▾',
  toolbarBackupToDir: '备份到目录',
  toolbarBackupToZip: '打包为 ZIP',
  scanBackupDone: '备份完成：复制 {copied}，跳过 {skipped}，目标 {dest}',
  scanBackupFailed: '备份失败：{message}',
  scanBackupNoSelection: '请先选择要备份的文件',
  // GalleryPage
  galleryNoData: '请先在「附件扫描」页面执行扫描',
  gallerySummaryTotal: '共 {count} 个附件',
  gallerySummarySize: '总大小: {size}',
  galleryFormatBreakdown: '格式分布',
  gallerySizeBreakdown: '大小分布',
  galleryStatsTotal: '附件总数',
  galleryStatsSize: '总大小',
  galleryStatsFiltered: '筛选结果',
  galleryGenerateThumbs: '生成全部缩略图',
  galleryGenerateThumbsDesc: '为仓库中所有附件图片生成三级缩略图缓存。已有 lazy load 等优化算法，直接查看原图也可以。不生成缩略图可节约磁盘空间，但浏览原图需要一定的电脑性能。',
  galleryClearCache: '清除缩略图缓存',
  galleryClearCacheDesc: '将删除画廊缩略图缓存（.voyager-gallery-cache）下的所有文件。每张图片会生成 3 个不同尺寸的缩略图（64px / 256px / 1024px），因此缩略图总数 / 3 = 实际图片数量。',
  galleryGenerating: '正在生成缩略图...',
  galleryGenerateDone: '缩略图生成完成',
  galleryOverviewGuide: '这里展示仓库中的全部附件，不仅是问题图片。适合用来统一浏览、筛选和抽查附件资产。',
  galleryControlsGuide: '缩略图模式更适合日常浏览；原图模式更真实但更吃性能；清除缓存只会删除生成的缩略图，不会删除原图。',

  brokenHint: '断链附件的图片文件不存在，无法直接打开。点击卡片查看详情，或右键卡片可以打开引用笔记或笔记目录进行确认。',

  // Backup All
  toolbarBackupAll: '备份全部 ▾',
  toolbarBackupAllToDir: '全部问题附件 → 目录',
  toolbarBackupAllToZip: '全部问题附件 → ZIP',

  // Duplicate Detection
  dupFindButton: '查找重复',
  dupFinding: '正在查找重复文件...',
  dupTitle: '重复文件',
  dupGroupCount: '共 {count} 组重复',
  dupKeepLabel: '保留',
  dupMergeButton: '合并所选组',
  dupMerging: '合并中...',
  dupMergeDone: '合并完成：更新 {mds} 个 MD，删除 {files} 个文件',
  dupMergeFailed: '合并失败：{message}',
  dupNoGroups: '未检测到重复文件',
  dupRefCount: '{count} 处引用',
  dupConfirmTitle: '确认合并重复文件',
  dupConfirmBody: '将删除选中的重复文件并更新所有 Markdown 引用指向保留文件。此操作不可撤销。',

  // Convert Format
  convertButton: '转格式',
  convertTitle: '批量转换图片格式',
  convertTargetFormat: '目标格式',
  convertQuality: '压缩质量',
  convertScope: '转换范围',
  convertScopeAll: '全部图片',
  convertScopeSelected: '仅选中的问题图片',
  convertScopeFormat: '仅指定原格式',
  convertExecute: '开始转换',
  convertConverting: '正在转换...',
  convertDone: '转换完成：转换 {converted}，跳过 {skipped}，节省 {saved}',
  convertFailed: '转换失败：{message}',
  convertConfirmTitle: '确认批量转格式',
  convertConfirmBody: '将转换图片格式并更新所有 Markdown 引用。原文件将被删除。此操作不可撤销。',

  // Health Score
  healthScoreTitle: '仓库健康度',
  healthScoreLabel: '健康评分',
  healthOrphanRate: '孤立率',
  healthMisplacedRate: '错位率',
  healthBrokenRate: '断链率',

  // Drag-to-fix broken
  detailDropHint: '拖入图片文件修复此断链',
  detailDropFixing: '正在修复...',
  detailDropFixDone: '断链修复成功：{path}',
  detailDropFixFailed: '修复失败：{message}',

  // Keyboard shortcuts
  shortcutSearchFocus: '搜索 (Ctrl+F)',

  helpTitle: '使用说明',
  helpPrereqTitle: 'Obsidian 前提设置',
  helpPrereqIntro: '本工具基于以下 Obsidian 设置才能正确工作，请确认你的仓库已按如下方式配置：',
  helpSettingAttachPath: '附件默认存放路径',
  helpSettingAttachPathValue: '当前文件所在文件夹下指定的子文件夹',
  helpSettingAttachPathDesc: '如果当前文件在 vault/folder 中，而设置子文件夹名称为 attachments，则附件将被保存至 vault/folder/attachments 路径下。',
  helpSettingSubfolder: '子文件夹名称',
  helpSettingSubfolderDesc: '必须设置为 attachments，本工具依据此目录名识别附件。',
  helpSettingLinkType: '笔记的内部链接类型',
  helpSettingLinkTypeValue: '基于当前笔记的相对路径',
  helpSettingLinkTypeDesc: '设置在笔记中链接其他文件时插入 [] 中的文件路径类型。',
  helpSettingWikiLink: '使用 Wiki 链接',
  helpSettingWikiLinkValue: '开启',
  helpSettingWikiLinkDesc: '开启后，在笔记中链接其他笔记或图像时，使用如 [[文件名]] 和 ![[图片名]] 这样的 Wiki 链接。关闭此选项则默认使用标准的 Markdown 超链接语法，如 []()。',
  helpSettingDelete: '删除文件设置（要如何处理已删除的文件？）',
  helpSettingDeleteValue: '移至 Obsidian 回收站（.trash 文件夹）',
  helpSettingDeleteDesc: '本工具会自动识别 .trash 文件夹中的笔记，将其视为已删除内容，不对其进行断链检测。',
  helpOverviewTitle: '软件能做什么',
  helpOverviewBody: '本工具用于扫描和整理 Obsidian 仓库中的图片附件，帮助你识别孤立、错位和断链问题，并提供备份、去重、转格式、统计和附件总览等能力。',
  helpScanTitle: '扫描页怎么用',
  helpScanBody: '先选择仓库并开始扫描，再按左侧分类和筛选条件缩小结果范围。选中单个问题后，可以在右侧查看详情，并执行打开、重命名、拖拽修复断链等操作。',
  helpGalleryTitle: '附件总览页怎么用',
  helpGalleryBody: '附件总览页展示仓库中的全部附件，适合统一检查图片资产。你可以按文件名、类型和大小筛选，并按需生成缩略图或清理缩略图缓存。',
  helpStatsTitle: '统计页怎么看',
  helpStatsBody: '统计页基于最近一次扫描结果生成，展示问题类型分布、文件类型分布、目录热点、时间分布和重复文件概况。处理完问题后建议重新扫描，以获得最新统计。',
  helpWorkflowsTitle: '常见使用流程',
  helpWorkflowScan: '日常清理：选择仓库 → 扫描 → 按分类筛选 → 选中问题 → 修复或导出。',
  helpWorkflowBroken: '修复断链：切换到断链分类 → 查看引用笔记 → 拖入正确图片文件或手动补齐缺失文件。',
  helpWorkflowBackup: '备份问题附件：在扫描页选择部分问题，或使用“备份全部”快速导出当前问题附件。',
  helpWorkflowDedup: '图片去重：使用“查找重复”查看重复组，选择保留文件后合并，并自动更新 Markdown 引用。',
  helpWorkflowConvert: '批量转格式：打开“转格式”，设置目标格式与范围，执行后会自动更新 Markdown 引用。',
  helpShortcutsTitle: '快捷键',
  helpShortcutSearch: 'Ctrl+F：聚焦搜索框。',
  helpShortcutDelete: 'Delete：删除/修复当前已选问题（会先弹出确认）。',
  helpShortcutSelectAll: 'Ctrl+A：全选当前结果。',
  helpShortcutEscape: 'Escape：关闭弹窗、覆盖层或退出全屏。',
}

const en: Translations = {
  // TitleBar - tabs
  tabScan: 'Issue Scan',
  tabMigrate: 'Migrate',
  tabStats: 'Stats',
  tabGallery: 'Gallery',
  tabHelp: 'Help',
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
  sidebarBrokenTooltip: 'Broken references: Markdown files reference an image file that does not exist on disk. The missing file must be provided manually.',
  sidebarFilterGuide: 'Use the left sidebar to narrow the current result set: switch issue type first, then refine by search, file type, and file size.',
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
  toolbarFixTooltip: 'Fix selected issues: Orphan attachments will be deleted; Misplaced attachments will be moved to the correct directory, and Markdown references will be updated automatically. Broken references cannot be auto-fixed and will be skipped — please provide the missing files manually.',
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
  statusGuide: 'Logs show what the current run is doing. History shows fixes, backups, migrations, or conversions that have already been executed.',

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
  detailMissingFilename: 'Missing Filename',
  detailOpenRefNote: 'Open Referencing Note',
  detailOpenRefNoteFolder: 'Open Note Folder',
  detailEmptyGuide: 'Select one issue to view its preview, path, reason, and available actions here.',

  // GalleryCard
  galleryNoImage: 'No image',
  galleryLoading: 'Loading...',
  galleryLoadFailed: 'Image load failed',
  galleryThumbLoadFailed: 'Thumbnail load failed',
  galleryNoThumb: 'No thumbnail',
  gallerySuggestedPath: 'Suggested: {path}',
  galleryBrokenPlaceholder: 'File not found',

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
  scanCtxOpenRefNote: 'Open Referencing Note',
  scanCtxOpenRefNoteFolder: 'Open Note Folder',
  scanCtxRename: 'Rename',
  scanRenameTitle: 'Rename Image',
  scanRenameCurrentName: 'Current name',
  scanRenameNewPlaceholder: 'Enter new filename...',
  scanRenameAffectedMds: '{count} Markdown file(s) will be updated',
  scanRenameDone: 'Rename complete: {count} MD files updated',
  scanRenameFailed: 'Rename failed: {message}',
  detailRename: 'Rename',
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
  scanOverviewGuide: 'This is the main workspace: choose a vault, run a scan, filter the results, then inspect details before fixing, backing up, deduplicating, converting, or exporting.',

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
  migrateOverviewGuide: 'Use this page when you want to reorganize folders by moving a note together with its related attachments. Choose the note and destination first, then preview before executing.',
  migrateActionGuide: 'Preview only shows the planned path changes. Execute Migration is the step that actually changes files.',

  // StatsPage
  statsNoData: 'Please run a scan on the "Scan" page first',
  statsOverview: 'Vault Overview',
  statsTotalMd: 'Total Markdown Files',
  statsTotalImages: 'Total Image Files',
  statsIssueCount: 'Issues',
  statsOrphanMisplaced: 'Orphan / Misplaced',
  statsOrphanMisplacedBroken: 'Orphan / Misplaced / Broken',
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
  statsOverviewGuide: 'The stats page is built from the most recent scan result and helps you understand issue count, distribution, hotspot directories, and the health score at a glance.',
  statsHealthGuide: 'A higher health score means fewer orphan, misplaced, and broken-reference problems. Re-run scan after large changes if you want refreshed numbers.',

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
  exportTypeBroken: 'Broken',
  toolbarBackup: 'Backup ▾',
  toolbarBackupToDir: 'Backup to Directory',
  toolbarBackupToZip: 'Export as ZIP',
  scanBackupDone: 'Backup complete: copied {copied}, skipped {skipped}, dest {dest}',
  scanBackupFailed: 'Backup failed: {message}',
  scanBackupNoSelection: 'Please select files to backup first',
  // GalleryPage
  galleryNoData: 'Please run a scan on the Scan page first',
  gallerySummaryTotal: '{count} attachments',
  gallerySummarySize: 'Total size: {size}',
  galleryFormatBreakdown: 'Format Breakdown',
  gallerySizeBreakdown: 'Size Distribution',
  galleryStatsTotal: 'Total',
  galleryStatsSize: 'Size',
  galleryStatsFiltered: 'Filtered',
  galleryGenerateThumbs: 'Generate All Thumbnails',
  galleryGenerateThumbsDesc: 'Generate three-tier thumbnail caches for all attachment images. Lazy loading is already enabled — viewing raw images works fine. Skipping thumbnails saves disk space, but browsing raw images requires more system resources.',
  galleryClearCache: 'Clear Thumbnail Cache',
  galleryClearCacheDesc: 'This will delete all files under the gallery thumbnail cache (.voyager-gallery-cache). Each image generates 3 thumbnails at different sizes (64px / 256px / 1024px), so total thumbnails / 3 = actual image count.',
  galleryGenerating: 'Generating thumbnails...',
  galleryGenerateDone: 'Thumbnail generation complete',
  galleryOverviewGuide: 'This page shows all attachments in the vault, not only problematic images. It is useful for browsing, filtering, and spot-checking your attachment library.',
  galleryControlsGuide: 'Thumbnail mode is best for routine browsing; raw image mode is more accurate but uses more resources; clearing cache only removes generated thumbnails and never deletes original images.',

  brokenHint: 'Broken references point to image files that do not exist. Click a card to view details, or right-click to open the referencing note or its folder.',

  // Backup All
  toolbarBackupAll: 'Backup All ▾',
  toolbarBackupAllToDir: 'All Issues → Directory',
  toolbarBackupAllToZip: 'All Issues → ZIP',

  // Duplicate Detection
  dupFindButton: 'Find Duplicates',
  dupFinding: 'Scanning for duplicates...',
  dupTitle: 'Duplicate Files',
  dupGroupCount: '{count} duplicate groups',
  dupKeepLabel: 'Keep',
  dupMergeButton: 'Merge Selected Groups',
  dupMerging: 'Merging...',
  dupMergeDone: 'Merge complete: updated {mds} MDs, deleted {files} files',
  dupMergeFailed: 'Merge failed: {message}',
  dupNoGroups: 'No duplicate files detected',
  dupRefCount: '{count} refs',
  dupConfirmTitle: 'Confirm Merge Duplicates',
  dupConfirmBody: 'This will delete selected duplicate files and update all Markdown references to point to the kept file. This cannot be undone.',

  // Convert Format
  convertButton: 'Convert',
  convertTitle: 'Batch Convert Image Format',
  convertTargetFormat: 'Target Format',
  convertQuality: 'Quality',
  convertScope: 'Scope',
  convertScopeAll: 'All Images',
  convertScopeSelected: 'Selected Issues Only',
  convertScopeFormat: 'Specific Source Formats',
  convertExecute: 'Start Conversion',
  convertConverting: 'Converting...',
  convertDone: 'Conversion complete: converted {converted}, skipped {skipped}, saved {saved}',
  convertFailed: 'Conversion failed: {message}',
  convertConfirmTitle: 'Confirm Batch Conversion',
  convertConfirmBody: 'This will convert image formats and update all Markdown references. Original files will be deleted. This cannot be undone.',

  // Health Score
  healthScoreTitle: 'Vault Health',
  healthScoreLabel: 'Health Score',
  healthOrphanRate: 'Orphan Rate',
  healthMisplacedRate: 'Misplaced Rate',
  healthBrokenRate: 'Broken Rate',

  // Drag-to-fix broken
  detailDropHint: 'Drop an image file here to fix this broken ref',
  detailDropFixing: 'Fixing...',
  detailDropFixDone: 'Broken ref fixed: {path}',
  detailDropFixFailed: 'Fix failed: {message}',

  // Keyboard shortcuts
  shortcutSearchFocus: 'Search (Ctrl+F)',

  helpTitle: 'Help',
  helpPrereqTitle: 'Required Obsidian Settings',
  helpPrereqIntro: 'This tool requires the following Obsidian settings to work correctly. Please verify your vault is configured as follows:',
  helpSettingAttachPath: 'Default attachment path',
  helpSettingAttachPathValue: 'In subfolder under current folder',
  helpSettingAttachPathDesc: 'If the current file is in vault/folder and the subfolder name is "attachments", attachments will be saved to vault/folder/attachments.',
  helpSettingSubfolder: 'Subfolder name',
  helpSettingSubfolderDesc: 'Must be set to "attachments". This tool uses this directory name to identify attachments.',
  helpSettingLinkType: 'Internal link type',
  helpSettingLinkTypeValue: 'Relative path to current note',
  helpSettingLinkTypeDesc: 'Controls the file path type inserted in [] when linking to other files in notes.',
  helpSettingWikiLink: 'Use Wiki links',
  helpSettingWikiLinkValue: 'Enabled',
  helpSettingWikiLinkDesc: 'When enabled, notes use [[filename]] and ![[image]] Wiki link syntax. When disabled, standard Markdown hyperlink syntax []() is used.',
  helpSettingDelete: 'Deleted files (How to handle deleted files?)',
  helpSettingDeleteValue: 'Move to Obsidian trash (.trash folder)',
  helpSettingDeleteDesc: 'This tool automatically recognizes notes in the .trash folder as deleted content and skips broken-link detection for them.',
  helpOverviewTitle: 'What this app can do',
  helpOverviewBody: 'This tool scans and organizes image attachments in Obsidian vaults. It helps you detect orphan, misplaced, and broken references, and also provides backup, deduplication, format conversion, stats, and attachment overview features.',
  helpScanTitle: 'How to use the Scan page',
  helpScanBody: 'Choose a vault and run a scan first, then use the left-side categories and filters to narrow the result set. After selecting one issue, use the right-side detail area to inspect it and run actions such as open, rename, or drag-to-fix for broken references.',
  helpGalleryTitle: 'How to use the Gallery page',
  helpGalleryBody: 'The Gallery page shows all attachments in the vault and is useful for browsing the whole attachment library. You can filter by filename, type, and size, then generate thumbnails or clear thumbnail cache when needed.',
  helpStatsTitle: 'How to read the Stats page',
  helpStatsBody: 'The Stats page is generated from the most recent scan result and shows issue distribution, file type distribution, hotspot directories, time distribution, and duplicate-file summaries. After making changes, re-run scan to refresh the stats.',
  helpWorkflowsTitle: 'Common workflows',
  helpWorkflowScan: 'Routine cleanup: choose vault → scan → filter by category → select issues → fix or export.',
  helpWorkflowBroken: 'Fix broken references: switch to the Broken category → inspect the referencing note → drag in the correct image file or restore the missing file manually.',
  helpWorkflowBackup: 'Back up problem files: select a subset on the Scan page, or use Back Up All to export all current problem attachments quickly.',
  helpWorkflowDedup: 'Deduplicate images: use Find Duplicates to inspect duplicate groups, choose the file to keep, then merge and update Markdown references automatically.',
  helpWorkflowConvert: 'Batch convert formats: open Convert Format, choose the target format and scope, then run it to update image files and Markdown references together.',
  helpShortcutsTitle: 'Keyboard shortcuts',
  helpShortcutSearch: 'Ctrl+F: focus the search box.',
  helpShortcutDelete: 'Delete: remove/fix the currently selected issues after confirmation.',
  helpShortcutSelectAll: 'Ctrl+A: select all current results.',
  helpShortcutEscape: 'Escape: close dialogs, overlays, or exit fullscreen.',
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
