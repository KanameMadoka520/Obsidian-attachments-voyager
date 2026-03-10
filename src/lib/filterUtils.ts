import type { AuditIssue, SizeFilter } from '../types'

export function matchesSizeFilter(issue: AuditIssue, sizeFilter: SizeFilter): boolean {
  if (sizeFilter === 'all') return true
  const size = issue.fileSize
  if (size == null) return true
  if (sizeFilter === 'small') return size < 102400
  if (sizeFilter === 'medium') return size >= 102400 && size <= 1048576
  return size > 1048576
}

export function getExtGroupKey(path: string, extGroupMap: Record<string, string>): string {
  const dot = path.lastIndexOf('.')
  if (dot < 0) return 'other'
  const ext = path.slice(dot + 1).toLowerCase()
  return extGroupMap[ext] ?? 'other'
}

export interface FilterParams {
  // Monotonic request id for async Worker filtering (used to ignore stale responses)
  requestId?: number
  issues: AuditIssue[]
  search: string
  fileTypeFilter: string[]
  totalTypeGroups: number
  sizeFilter: SizeFilter
  extGroupMap: Record<string, string>
}

export function filterIssues(params: FilterParams): AuditIssue[] {
  const { issues, search, fileTypeFilter, totalTypeGroups, sizeFilter, extGroupMap } = params
  const fileTypeSet = new Set(fileTypeFilter)

  let filtered = issues

  if (search) {
    const lower = search.toLowerCase()
    filtered = filtered.filter((i) => i.imagePath.toLowerCase().includes(lower))
  }

  if (fileTypeSet.size < totalTypeGroups) {
    filtered = filtered.filter((i) => fileTypeSet.has(getExtGroupKey(i.imagePath, extGroupMap)))
  }

  if (sizeFilter !== 'all') {
    filtered = filtered.filter((i) => matchesSizeFilter(i, sizeFilter))
  }

  return filtered
}
