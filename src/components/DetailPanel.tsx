import { useState, useCallback } from 'react'
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
  onRename?: (issue: AuditIssue) => void
  onDropFixBroken?: (files: FileList, issue: AuditIssue) => void
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
  onRename,
  onDropFixBroken,
}: DetailPanelProps) {
  const tr = useLang()
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (issue?.type !== 'broken') return
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [issue])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (issue?.type === 'broken' && e.dataTransfer.files.length > 0 && onDropFixBroken) {
      onDropFixBroken(e.dataTransfer.files, issue)
    }
  }, [issue, onDropFixBroken])

  if (!issue && selectedCount <= 1) {
    return (
      <aside className="detail-panel">
        <div className="detail-panel-inner">
          <div className="detail-multi-select">{tr.detailEmptyGuide}</div>
        </div>
      </aside>
    )
  }

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

  const previewSrc = issue.type !== 'broken'
    ? (getThumbSrc(issue, 'medium') || getThumbSrc(issue, 'small') || toFilePreviewSrc(issue.imagePath))
    : ''

  return (
    <aside className="detail-panel">
      <div className="detail-panel-inner">
        {issue.type === 'broken' ? (
          <div
            className="detail-preview"
            style={{
              display: 'grid', placeItems: 'center', color: 'var(--text-muted)',
              border: dragOver ? '2px dashed var(--accent-color, #4a9eff)' : '2px dashed transparent',
              background: dragOver ? 'var(--accent-bg, rgba(74,158,255,0.08))' : undefined,
              transition: 'border 0.15s, background 0.15s',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', opacity: 0.5 }}>&#x26A0;</div>
              <div style={{ fontSize: '0.8rem' }}>{tr.galleryBrokenPlaceholder}</div>
              {onDropFixBroken && (
                <div style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.7 }}>{tr.detailDropHint}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="detail-preview">
            <img src={previewSrc} alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
        )}
        <div className="detail-attrs">
          {issue.type === 'broken' && (
            <div className="detail-row">
              <span className="detail-label">{tr.detailMissingFilename}</span>
              <span className="detail-value">{issue.imagePath}</span>
            </div>
          )}
          {issue.type !== 'broken' && (
            <>
              <div className="detail-row">
                <span className="detail-label">{tr.detailFileName}</span>
                <span className="detail-value">{basename(issue.imagePath)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{tr.detailPath}</span>
                <span className="detail-value detail-value-path">{issue.imagePath}</span>
              </div>
            </>
          )}
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
          {issue.type !== 'broken' && (
            <>
              <button type="button" className="btn-sm" onClick={() => onOpenFile?.(issue.imagePath)}>{tr.detailOpenFile}</button>
              <button type="button" className="btn-sm" onClick={() => onOpenFolder?.(issue.imagePath)}>{tr.detailOpenFolder}</button>
              <button type="button" className="btn-sm" onClick={() => onFullscreen?.(issue)}>{tr.detailFullscreen}</button>
              <button type="button" className="btn-sm" onClick={() => onRename?.(issue)}>{tr.detailRename}</button>
            </>
          )}
          {issue.type === 'broken' && issue.mdPath && (
            <>
              <button type="button" className="btn-sm" onClick={() => onOpenFile?.(issue.mdPath!)}>{tr.detailOpenRefNote}</button>
              <button type="button" className="btn-sm" onClick={() => onOpenFolder?.(issue.mdPath!)}>{tr.detailOpenRefNoteFolder}</button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

export default DetailPanel
