export type Lang = 'zh' | 'en'

export type IssueType = 'orphan' | 'misplaced' | 'broken' | 'multi_ref_conflict' | 'target_conflict'

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

export interface AttachmentInfo {
  path: string
  fileName: string
  fileSize: number
  fileMtime: number
}

export interface ScanResult {
  totalMd: number
  totalImages: number
  issues: AuditIssue[]
  scanIndex: ScanIndex
  allImages?: AttachmentInfo[]
}

export interface DuplicateFile {
  absPath: string
  fileSize: number
  refCount: number
}

export interface DuplicateGroup {
  hash: string
  files: DuplicateFile[]
}

export interface MergeSummary {
  updatedMds: number
  deletedFiles: number
}

export interface ConvertSummary {
  converted: number
  skipped: number
  savedBytes: number
}

export type GalleryDisplayMode = 'thumbnail' | 'rawImage' | 'noImage'

export type SizeFilter = 'all' | 'small' | 'medium' | 'large'

export type ThemeMode = 'auto' | 'light' | 'dark' | 'parchment'

export type ConflictPolicy = 'promptEach' | 'overwriteAll' | 'renameAll'

export interface OperationEntry {
  entryId: string
  filePath: string
  action: string
  source: string
  target: string
  status: 'applied' | 'failed' | 'skipped'
  message?: string
}

export interface OperationTask {
  taskId: string
  taskType: string
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
