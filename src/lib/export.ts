import type { AuditIssue } from '../types'

function formatSize(bytes?: number): string {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function toJSON(issues: AuditIssue[]): string {
  return JSON.stringify(issues, null, 2)
}

export function toCSV(issues: AuditIssue[]): string {
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

export function toMarkdown(issues: AuditIssue[]): string {
  const lines: string[] = [
    '# Voyager 扫描报告',
    '',
    `共 ${issues.length} 个问题`,
    '',
    '| 类型 | 图片路径 | 大小 | 原因 | 建议目标 |',
    '|------|---------|------|------|---------|',
  ]
  for (const i of issues) {
    const type = i.type === 'orphan' ? '孤立' : '错位'
    const size = formatSize(i.fileSize)
    const target = i.suggestedTarget ?? '-'
    lines.push(`| ${type} | ${i.imagePath} | ${size} | ${i.reason} | ${target} |`)
  }
  return lines.join('\n')
}
