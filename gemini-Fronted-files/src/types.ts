export type IssueType = 'orphan' | 'misplaced' | 'multi_ref_conflict' | 'target_conflict'

export interface AuditIssue {
  id: string
  type: IssueType
  mdPath?: string
  imagePath: string
  reason: string
  suggestedTarget?: string
}

export interface ScanResult {
  totalMd: number
  totalImages: number
  issues: AuditIssue[]
}
