export type IssueType = 'orphan' | 'misplaced' | 'multi_ref_conflict' | 'target_conflict'

export interface AuditIssue {
  id: string
  type: IssueType
  mdPath?: string
  imagePath: string
  reason: string
  suggestedTarget?: string
  thumbnailPath?: string
}

export interface ScanResult {
  totalMd: number
  totalImages: number
  issues: AuditIssue[]
}

export type ConflictPolicy = 'promptEach' | 'overwriteAll' | 'renameAll'

export interface OperationEntry {
  entryId: string
  filePath: string
  action: 'move' | 'delete'
  source: string
  target: string
  status: 'applied' | 'undone' | 'failed' | 'skipped'
  message?: string
}

export interface OperationTask {
  taskId: string
  taskType: 'migration' | 'fix'
  createdAt: string
  policy: ConflictPolicy
  status: 'applied' | 'partiallyUndone' | 'undone'
  entries: OperationEntry[]
}

export interface RuntimeLogLine {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}
