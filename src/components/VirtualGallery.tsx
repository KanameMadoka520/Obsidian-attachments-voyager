import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import GalleryCard from './GalleryCard'
import type { AuditIssue, GalleryDisplayMode } from '../types'

const ROW_HEIGHT = 220
const MIN_CARD_WIDTH = 170

interface VirtualGalleryProps {
  issues: AuditIssue[]
  displayMode: GalleryDisplayMode
  selectedIssueIds: Set<string>
  issueIndexMap: Map<string, number>
  toFilePreviewSrc: (path: string) => string
  getThumbSrc: (issue: AuditIssue, size: 'tiny' | 'small' | 'medium') => string
  onIssueClick: (issueId: string, index: number, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onPreviewClick: (issue: AuditIssue) => void
  onContextMenu?: (issue: AuditIssue, x: number, y: number) => void
}

function VirtualGallery({
  issues,
  displayMode,
  selectedIssueIds,
  issueIndexMap,
  toFilePreviewSrc,
  getThumbSrc,
  onIssueClick,
  onPreviewClick,
  onContextMenu,
}: VirtualGalleryProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    setContainerWidth(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const columnCount = Math.max(1, Math.floor(containerWidth / MIN_CARD_WIDTH))
  const rowCount = Math.ceil(issues.length / columnCount)

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  })

  if (issues.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        当前分类下没有问题图片
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      style={{
        height: Math.min(600, rowCount * ROW_HEIGHT + 20),
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount
          const rowIssues = issues.slice(startIndex, startIndex + columnCount)
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: 12,
                padding: '0 2px',
              }}
            >
              {rowIssues.map((issue, colIdx) => (
                <GalleryCard
                  key={issue.id}
                  issue={issue}
                  displayMode={displayMode}
                  checked={selectedIssueIds.has(issue.id)}
                  issueIndex={issueIndexMap.get(issue.id) ?? (startIndex + colIdx)}
                  toFilePreviewSrc={toFilePreviewSrc}
                  getThumbSrc={getThumbSrc}
                  onCardClick={onIssueClick}
                  onPreviewClick={onPreviewClick}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default VirtualGallery
