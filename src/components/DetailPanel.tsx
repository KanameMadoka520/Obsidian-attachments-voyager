import type { AuditIssue } from '../types'

interface DetailPanelProps {
  issue: AuditIssue | null
  selectedCount: number
  toFilePreviewSrc: (path: string) => string
  getThumbSrc: (issue: AuditIssue, size: 'tiny' | 'small' | 'medium') => string
  onOpenFile?: (path: string) => void
  onOpenFolder?: (path: string) => void
  onFullscreen?: (issue: AuditIssue) => void
}

function basename(path: string) {
  const normalized = path.split('\\').join('/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

function DetailPanel({
  issue,
  selectedCount,
  toFilePreviewSrc,
  getThumbSrc,
  onOpenFile,
  onOpenFolder,
  onFullscreen,
}: DetailPanelProps) {
  if (!issue && selectedCount <= 1) return null

  if (!issue && selectedCount > 1) {
    return (
      <aside className="detail-panel">
        <div className="detail-panel-inner">
          <div className="detail-multi-select">
            已选择 {selectedCount} 张图片
          </div>
        </div>
      </aside>
    )
  }

  if (!issue) return null

  const previewSrc = getThumbSrc(issue, 'medium') || getThumbSrc(issue, 'small') || toFilePreviewSrc(issue.imagePath)

  return (
    <aside className="detail-panel">
      <div className="detail-panel-inner">
        <div className="detail-preview">
          <img src={previewSrc} alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
        <div className="detail-attrs">
          <div className="detail-row">
            <span className="detail-label">文件名</span>
            <span className="detail-value">{basename(issue.imagePath)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">路径</span>
            <span className="detail-value detail-value-path">{issue.imagePath}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">类型</span>
            <span className="detail-value">{issue.type}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">原因</span>
            <span className="detail-value">{issue.reason}</span>
          </div>
          {issue.suggestedTarget && (
            <div className="detail-row">
              <span className="detail-label">建议目标</span>
              <span className="detail-value detail-value-path">{issue.suggestedTarget}</span>
            </div>
          )}
          {issue.mdPath && (
            <div className="detail-row">
              <span className="detail-label">引用笔记</span>
              <span className="detail-value detail-value-path">{issue.mdPath}</span>
            </div>
          )}
        </div>
        <div className="detail-actions">
          <button type="button" className="btn-sm" onClick={() => onOpenFile?.(issue.imagePath)}>打开文件</button>
          <button type="button" className="btn-sm" onClick={() => onOpenFolder?.(issue.imagePath)}>打开目录</button>
          <button type="button" className="btn-sm" onClick={() => onFullscreen?.(issue)}>全屏查看</button>
        </div>
      </div>
    </aside>
  )
}

export default DetailPanel
