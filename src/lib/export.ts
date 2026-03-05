import { getTranslations } from './i18n'
import type { Lang } from './i18n'
import type { AuditIssue } from '../types'

function formatSize(bytes?: number): string {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function toJSON(issues: AuditIssue[], _lang: Lang = 'zh'): string {
  return JSON.stringify(issues, null, 2)
}

export function toCSV(issues: AuditIssue[], _lang: Lang = 'zh'): string {
  const header = 'id,type,imagePath,reason,suggestedTarget,mdPath,fileSize'
  const rows = issues.map((i) => {
    const fields = [
      i.id,
      i.type,
      i.imagePath,
      i.reason,
      i.suggestedTarget ?? '',
      i.mdPath ?? '',
      i.fileSize != null ? String(i.fileSize) : '',
    ]
    return fields.map((f) => `"${f.replace(/"/g, '""')}"`).join(',')
  })
  return [header, ...rows].join('\n')
}

export function toMarkdown(issues: AuditIssue[], lang: Lang = 'zh'): string {
  const tr = getTranslations(lang)
  const lines: string[] = [
    `# ${tr.exportReportTitle}`,
    '',
    tr.exportReportSummary.replace('{count}', String(issues.length)),
    '',
    `| ${tr.exportColType} | ${tr.exportColImagePath} | ${tr.exportColSize} | ${tr.exportColReason} | ${tr.exportColSuggestedTarget} |`,
    '|------|---------|------|------|---------|',
  ]
  for (const i of issues) {
    const type = i.type === 'orphan' ? tr.exportTypeOrphan : tr.exportTypeMisplaced
    const size = formatSize(i.fileSize)
    const target = i.suggestedTarget ?? '-'
    lines.push(`| ${type} | ${i.imagePath} | ${size} | ${i.reason} | ${target} |`)
  }
  return lines.join('\n')
}
