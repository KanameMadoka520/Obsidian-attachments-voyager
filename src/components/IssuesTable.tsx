import type { AuditIssue } from '../types'

interface IssueSelectModifier {
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}

interface IssuesTableProps {
  title: string
  mode: 'orphan' | 'misplaced'
  issues: AuditIssue[]
  onOpenFile?: (path: string) => void
  onOpenFolder?: (path: string) => void
  onOpenMarkdownFile?: (path: string) => void
  onOpenMarkdownFolder?: (path: string) => void
  selectedIssueIds?: string[]
  onIssueRowClick?: (issueId: string, index: number, event: IssueSelectModifier) => void
  indexOfIssue?: (issueId: string) => number
  trashDeleteIds?: string[]
  onToggleTrashDelete?: (issueId: string) => void
  toFilePreviewSrc?: (path: string) => string
  onPreviewClick?: (issue: AuditIssue) => void
}

function basename(path?: string) {
  if (!path) return '-'
  const normalized = path.split('\\').join('/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

function IssuesTable({
  title,
  mode,
  issues,
  onOpenFile,
  onOpenFolder,
  onOpenMarkdownFile,
  onOpenMarkdownFolder,
  selectedIssueIds = [],
  onIssueRowClick,
  indexOfIssue,
  trashDeleteIds = [],
  onToggleTrashDelete,
  toFilePreviewSrc,
  onPreviewClick,
}: IssuesTableProps) {
  const selectedSet = new Set(selectedIssueIds)
  const trashDeleteSet = new Set(trashDeleteIds)

  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>选择</th>
              {toFilePreviewSrc && <th style={{ width: '60px' }}>预览</th>}
              <th style={{ width: mode === 'orphan' ? '40%' : '22%' }}>图片路径</th>
              {mode === 'misplaced' && <th style={{ width: '18%' }}>建议路径</th>}
              {mode === 'misplaced' && <th style={{ width: '16%' }}>引用 Markdown</th>}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan={99} className="empty-state">
                  当前类型暂无问题
                </td>
              </tr>
            ) : (
              issues.map((issue) => {
                const rowIndex = indexOfIssue ? indexOfIssue(issue.id) : -1
                const selected = selectedSet.has(issue.id)
                return (
                  <tr
                    key={issue.id}
                    onClick={(e) =>
                      rowIndex >= 0 &&
                      onIssueRowClick?.(issue.id, rowIndex, {
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                      })
                    }
                    style={selected ? { backgroundColor: 'var(--selection-bg)' } : undefined}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected}
                        readOnly
                        onClick={(e) => {
                          e.stopPropagation()
                          if (rowIndex >= 0) {
                            onIssueRowClick?.(issue.id, rowIndex, {
                              shiftKey: e.shiftKey,
                              ctrlKey: e.ctrlKey,
                              metaKey: e.metaKey,
                            })
                          }
                        }}
                      />
                    </td>
                    {toFilePreviewSrc && (
                      <td style={{ padding: 4 }}>
                        {issue.thumbnailPaths?.tiny ? (
                          <img
                            src={toFilePreviewSrc(issue.thumbnailPaths.tiny)}
                            alt=""
                            loading="lazy"
                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block', cursor: onPreviewClick ? 'pointer' : undefined }}
                            onClick={(e) => {
                              if (onPreviewClick) {
                                e.stopPropagation()
                                onPreviewClick(issue)
                              }
                            }}
                            onError={(e) => { ;(e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--placeholder-bg)', display: 'grid', placeItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            无
                          </div>
                        )}
                      </td>
                    )}
                    <td style={{ wordBreak: 'break-all' }}>{issue.imagePath}</td>
                    {mode === 'misplaced' && (
                      <td style={{ wordBreak: 'break-all' }}>{issue.suggestedTarget ?? '-'}</td>
                    )}
                    {mode === 'misplaced' && (
                      <td style={{ wordBreak: 'break-all' }}>
                        <div>
                          <div>{basename(issue.mdPath)}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{issue.mdPath ?? '-'}</div>
                        </div>
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenFile?.(issue.imagePath)
                            }}
                          >
                            图片-打开文件
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenFolder?.(issue.imagePath)
                            }}
                          >
                            图片-打开目录
                          </button>
                        </div>
                        {mode === 'misplaced' && issue.mdPath && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenMarkdownFile?.(issue.mdPath!)
                              }}
                            >
                              Markdown-打开文件
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenMarkdownFolder?.(issue.mdPath!)
                              }}
                            >
                              Markdown-打开目录
                            </button>
                            {issue.reason.includes('trash') && (
                              <button
                                type="button"
                                className={`btn ${trashDeleteSet.has(issue.id) ? 'btn-danger' : 'btn-secondary'}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleTrashDelete?.(issue.id)
                                }}
                              >
                                {trashDeleteSet.has(issue.id) ? '已选：删除图片' : '改为删除图片'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default IssuesTable
