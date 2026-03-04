import { memo } from 'react'
import type { AuditIssue, GalleryDisplayMode } from '../types'

interface GalleryCardProps {
  issue: AuditIssue
  displayMode: GalleryDisplayMode
  checked: boolean
  issueIndex: number
  toFilePreviewSrc: (path: string) => string
  getThumbSrc: (issue: AuditIssue, size: 'tiny' | 'small' | 'medium') => string
  onCardClick: (issueId: string, index: number, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onPreviewClick: (issue: AuditIssue) => void
  onContextMenu?: (issue: AuditIssue, x: number, y: number) => void
}

const GalleryCard = memo(function GalleryCard({
  issue,
  displayMode,
  checked,
  issueIndex,
  toFilePreviewSrc,
  getThumbSrc,
  onCardClick,
  onPreviewClick,
  onContextMenu,
}: GalleryCardProps) {
  return (
    <label
      style={{
        border: checked ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
        borderRadius: 8,
        padding: 8,
        background: 'var(--panel-bg)',
        cursor: 'pointer',
      }}
      onClick={(e) => {
        if (issueIndex >= 0) {
          onCardClick(issue.id, issueIndex, {
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
          })
        }
      }}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(issue, e.clientX, e.clientY)
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <input type="checkbox" readOnly checked={checked} />
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 120,
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--placeholder-bg)',
          cursor: displayMode === 'noImage' ? 'default' : 'zoom-in',
        }}
        onClick={(e) => {
          if (displayMode === 'noImage') return
          e.preventDefault()
          e.stopPropagation()
          onPreviewClick(issue)
        }}
      >
        {displayMode === 'noImage' ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            不显示图片
          </div>
        ) : displayMode === 'rawImage' ? (
          <>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              加载中...
            </div>
            <img
              src={toFilePreviewSrc(issue.imagePath)}
              alt={issue.imagePath}
              loading="lazy"
              onLoad={(e) => {
                const placeholder = (e.currentTarget as HTMLImageElement).previousElementSibling as HTMLElement | null
                if (placeholder) placeholder.style.display = 'none'
              }}
              onError={(e) => {
                const placeholder = (e.currentTarget as HTMLImageElement).previousElementSibling as HTMLElement | null
                if (placeholder) placeholder.textContent = '图片加载失败'
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
            />
          </>
        ) : (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                textAlign: 'center',
                padding: 8,
                boxSizing: 'border-box',
              }}
            >
              {(issue.thumbnailPaths || issue.thumbnailPath) ? '缩略图加载失败' : '未生成缩略图'}
            </div>
            {(issue.thumbnailPaths || issue.thumbnailPath) && (
              <img
                src={getThumbSrc(issue, 'small')}
                alt={issue.imagePath}
                loading="lazy"
                onLoad={(e) => {
                  const placeholder = (e.currentTarget as HTMLImageElement).previousElementSibling as HTMLElement | null
                  if (placeholder) placeholder.style.display = 'none'
                }}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              />
            )}
          </>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all', overflow: 'hidden', maxHeight: '2.4em', lineHeight: '1.2em' }}>
        {issue.imagePath}
      </div>
      {issue.type === 'misplaced' && (
        <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all', overflow: 'hidden', maxHeight: '2.4em', lineHeight: '1.2em' }}>
          建议路径：{issue.suggestedTarget ?? '-'}
        </div>
      )}
    </label>
  )
})

export default GalleryCard
