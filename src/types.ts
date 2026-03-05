export type Lang = 'zh' | 'en'

export type IssueType = 'orphan' | 'misplaced' | 'multi_ref_conflict' | 'target_conflict'

export interface AuditIssue {
  id: string
  type: IssueType
  mdPath?: string
  imagePath: string
  reason: string
  suggestedTarget?: string
  thumbnailPath?: string
  thumbnailPaths?: { tiny?: string; small?: string; medium?: string }
  fileSize?: number
  fileMtime?: number
}

export interface ScanIndex {
  files: Record<string, number>
  mdRefs: Record<string, string[]>
}

export interface ScanResult {
  totalMd: number
  totalImages: number
  issues: AuditIssue[]
  scanIndex: ScanIndex
}

export type GalleryDisplayMode = 'thumbnail' | 'rawImage' | 'noImage'

export type SizeFilter = 'all' | 'small' | 'medium' | 'large'

export type ThemeMode = 'auto' | 'light' | 'dark' | 'parchment'

export type ConflictPolicy = 'promptEach' | 'overwriteAll' | 'renameAll'

export interface OperationEntry {
  entryId: string
  filePath: string
  action: 'move' | 'delete'
  source: string
  target: string
  status: 'applied' | 'failed' | 'skipped'
  message?: string
}

export interface OperationTask {
  taskId: string
  taskType: 'migration' | 'fix'
  createdAt: string
  policy: ConflictPolicy
  status: 'applied'
  entries: OperationEntry[]
}

export interface RuntimeLogLine {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}
