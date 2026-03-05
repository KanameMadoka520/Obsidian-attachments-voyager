import type { AuditIssue } from '../types'
import { useLang } from '../App'

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
  const tr = useLang()

  if (!issue && selectedCount <= 1) return null

  if (!issue && selectedCount > 1) {
    return (
      <aside className="detail-panel">
        <div className="detail-panel-inner">
          <div className="detail-multi-select">
            {tr.detailMultiSelect.replace('{count}', String(selectedCount))}
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
            <span className="detail-label">{tr.detailFileName}</span>
            <span className="detail-value">{basename(issue.imagePath)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{tr.detailPath}</span>
            <span className="detail-value detail-value-path">{issue.imagePath}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{tr.detailType}</span>
            <span className="detail-value">{issue.type}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{tr.detailReason}</span>
            <span className="detail-value">{issue.reason}</span>
          </div>
          {issue.suggestedTarget && (
            <div className="detail-row">
              <span className="detail-label">{tr.detailSuggestedTarget}</span>
              <span className="detail-value detail-value-path">{issue.suggestedTarget}</span>
            </div>
          )}
          {issue.mdPath && (
            <div className="detail-row">
              <span className="detail-label">{tr.detailRefNote}</span>
              <span className="detail-value detail-value-path">{issue.mdPath}</span>
            </div>
          )}
        </div>
        <div className="detail-actions">
          <button type="button" className="btn-sm" onClick={() => onOpenFile?.(issue.imagePath)}>{tr.detailOpenFile}</button>
          <button type="button" className="btn-sm" onClick={() => onOpenFolder?.(issue.imagePath)}>{tr.detailOpenFolder}</button>
          <button type="button" className="btn-sm" onClick={() => onFullscreen?.(issue)}>{tr.detailFullscreen}</button>
        </div>
      </div>
    </aside>
  )
}

export default DetailPanel
