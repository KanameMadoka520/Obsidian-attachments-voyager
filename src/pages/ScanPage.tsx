import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { open } from '@tauri-apps/api/dialog'
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri'
import { appWindow } from '@tauri-apps/api/window'
import ConfirmDialog from '../components/ConfirmDialog'
import IssuesTable from '../components/IssuesTable'
import OperationHistoryPanel from '../components/OperationHistoryPanel'
import StatsCards from '../components/StatsCards'
import VirtualGallery from '../components/VirtualGallery'
import WorkLogPanel from '../components/WorkLogPanel'
import type { AuditIssue, ConflictPolicy, GalleryDisplayMode, OperationTask, RuntimeLogLine, ScanResult } from '../types'
import { scanVault } from '../lib/commands'

interface FixSummary {
  taskId: string
  moved: number
  deleted: number
  skipped: number
}

interface UndoSummary {
  warnings: string[]
}

interface ScanPageProps {
  conflictPolicy: ConflictPolicy
}

const RECENT_VAULTS_KEY = 'voyager-recent-vaults-v1'
const DISPLAY_MODE_KEY = 'voyager-display-mode-v1'
const LAST_VAULT_KEY = 'voyager-last-vault-v1'
const CACHED_RESULT_KEY = 'voyager-cached-scan-result-v1'

function loadDisplayMode(): GalleryDisplayMode {
  const raw = localStorage.getItem(DISPLAY_MODE_KEY)
  if (raw === 'rawImage' || raw === 'noImage') return raw
  return 'thumbnail'
}

function loadRecentVaults(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_VAULTS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is string => typeof x === 'string').slice(0, 8)
  } catch {
    return []
  }
}

function saveRecentVault(path: string) {
  const normalized = path.trim()
  if (!normalized) return
  const current = loadRecentVaults()
  const next = [normalized, ...current.filter((p) => p !== normalized)].slice(0, 8)
  localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(next))
  localStorage.setItem(LAST_VAULT_KEY, normalized)
}

function loadLastVault(): string {
  return localStorage.getItem(LAST_VAULT_KEY) ?? ''
}

function loadCachedResult(): ScanResult | undefined {
  try {
    const raw = localStorage.getItem(CACHED_RESULT_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as ScanResult
  } catch {
    return undefined
  }
}

function saveCachedResult(result: ScanResult | undefined) {
  if (!result) {
    localStorage.removeItem(CACHED_RESULT_KEY)
  } else {
    localStorage.setItem(CACHED_RESULT_KEY, JSON.stringify(result))
  }
}

function toFilePreviewSrc(path: string) {
  const normalized = path.split('\\').join('/')
  return convertFileSrc(normalized)
}

function toThumbPreviewSrc(path?: string) {
  if (!path) return ''
  return toFilePreviewSrc(path)
}

function getThumbSrc(issue: AuditIssue, size: 'tiny' | 'small' | 'medium'): string {
  const path = issue.thumbnailPaths?.[size] ?? (size === 'small' ? issue.thumbnailPath : undefined)
  return path ? toFilePreviewSrc(path) : ''
}

function ScanPage({ conflictPolicy }: ScanPageProps) {
  const [vaultPath, setVaultPath] = useState(() => loadLastVault())
  const [recentVaults, setRecentVaults] = useState<string[]>(() => loadRecentVaults())
  const [result, setResult] = useState<ScanResult | undefined>(() => loadCachedResult())
  const [resultIsStale, setResultIsStale] = useState(() => loadCachedResult() !== undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fixing, setFixing] = useState(false)
  const [logs, setLogs] = useState<RuntimeLogLine[]>([])
  const [tasks, setTasks] = useState<OperationTask[]>([])
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([])
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null)
  const [galleryTab, setGalleryTab] = useState<'orphan' | 'misplaced'>('orphan')
  const [listTab, setListTab] = useState<'orphan' | 'misplaced'>('orphan')
  const [trashDeleteIds, setTrashDeleteIds] = useState<string[]>([])
  const [generateThumbs, setGenerateThumbs] = useState(true)
  const [displayMode, setDisplayMode] = useState<GalleryDisplayMode>(() => loadDisplayMode())
  const [galleryActionIssue, setGalleryActionIssue] = useState<AuditIssue | null>(null)
  // null = fit-to-container, number = scale relative to image's natural pixel size (1 = 100% native)
  const [previewZoom, setPreviewZoom] = useState<number | null>(null)
  const [previewNaturalSize, setPreviewNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [fullscreenIssue, setFullscreenIssue] = useState<AuditIssue | null>(null)
  const [fsZoom, setFsZoom] = useState<number | null>(null)
  const [fsNatural, setFsNatural] = useState<{ w: number; h: number } | null>(null)
  const fsScrollRef = useRef<HTMLDivElement>(null)
  const fsDragState = useRef<{ dragging: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    dragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0,
  })
  const fsWheelRef = useRef<HTMLDivElement>(null)

  const enterFullscreen = useCallback((issue: AuditIssue) => {
    setFullscreenIssue(issue)
    setFsZoom(null)
    setFsNatural(null)
    appWindow.setFullscreen(true).catch(() => {})
  }, [])

  const exitFullscreen = useCallback(() => {
    setFullscreenIssue(null)
    setFsZoom(null)
    setFsNatural(null)
    appWindow.setFullscreen(false).catch(() => {})
  }, [])

  // Fullscreen wheel zoom (non-passive)
  useEffect(() => {
    const el = fsWheelRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setFsZoom((prev) => {
        const current = prev ?? 0.5
        const delta = e.deltaY < 0 ? 0.15 : -0.15
        return Math.max(0.1, Math.min(10, current + delta))
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  })

  // Drag-to-pan state
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    dragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0,
  })

  // Attach wheel handler as non-passive native listener so preventDefault works
  const wheelZoomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = wheelZoomRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setPreviewZoom((prev) => {
        const current = prev ?? 0.5
        const delta = e.deltaY < 0 ? 0.15 : -0.15
        return Math.max(0.1, Math.min(8, current + delta))
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  })

  const handlePreviewMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const el = previewScrollRef.current
    if (!el) return
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
    e.preventDefault()
  }, [])

  const handlePreviewMouseMove = useCallback((e: React.MouseEvent) => {
    const ds = dragState.current
    if (!ds.dragging) return
    const el = previewScrollRef.current
    if (!el) return
    el.scrollLeft = ds.scrollLeft - (e.clientX - ds.startX)
    el.scrollTop = ds.scrollTop - (e.clientY - ds.startY)
  }, [])

  const handlePreviewMouseUp = useCallback(() => {
    dragState.current.dragging = false
  }, [])

  const handlePreviewClick = useCallback(() => {
    // Toggle between fit and native size on click (only if not dragging)
    if (dragState.current.dragging) return
    setPreviewZoom((prev) => (prev === null ? 1 : null))
  }, [])

  const changeDisplayMode = (mode: GalleryDisplayMode) => {
    setDisplayMode(mode)
    localStorage.setItem(DISPLAY_MODE_KEY, mode)
  }

  const issues = result?.issues ?? []
  const orphanIssues = issues.filter((i) => i.type === 'orphan')
  const misplacedIssues = issues.filter((i) => i.type === 'misplaced')

  const issueIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    issues.forEach((issue, index) => map.set(issue.id, index))
    return map
  }, [issues])

  const refreshOps = async () => {
    try {
      const [fetchedLogs, fetchedTasks] = await Promise.all([
        invoke<RuntimeLogLine[]>('get_runtime_logs', { limit: 200 }),
        invoke<OperationTask[]>('list_operation_history'),
      ])
      setLogs(fetchedLogs)
      setTasks(fetchedTasks.slice().reverse())
    } catch {
      // ignore background refresh error
    }
  }

  useEffect(() => {
    refreshOps()
    const timer = setInterval(refreshOps, 3000)
    return () => clearInterval(timer)
  }, [])

  const pickDirectory = async () => {
    const selected = await open({ directory: true, multiple: false })
    if (typeof selected === 'string') {
      setVaultPath(selected)
      saveRecentVault(selected)
      setRecentVaults(loadRecentVaults())
    }
  }

  const runScan = async () => {
    if (!vaultPath.trim()) {
      setError('请先选择仓库路径')
      return
    }

    setLoading(true)
    setError('')

    try {
      const scanResult = await scanVault(vaultPath, { generateThumbs, thumbSize: 256 })
      setResult(scanResult)
      saveCachedResult(scanResult)
      setResultIsStale(false)
      setSelectedIssueIds([])
      setAnchorIndex(null)
      setTrashDeleteIds([])
      saveRecentVault(vaultPath)
      setRecentVaults(loadRecentVaults())
      await refreshOps()
    } catch (e) {
      setResult(undefined)
      saveCachedResult(undefined)
      setError(e instanceof Error ? e.message : '扫描失败')
    } finally {
      setLoading(false)
    }
  }

  const handleIssueRowClick = (
    issueId: string,
    index: number,
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
  ) => {
    setSelectedIssueIds((prev) => {
      const hasIssue = prev.includes(issueId)

      if (event.shiftKey && anchorIndex !== null && issues.length > 0) {
        const from = Math.min(anchorIndex, index)
        const to = Math.max(anchorIndex, index)
        return issues.slice(from, to + 1).map((i) => i.id)
      }

      if (event.ctrlKey || event.metaKey) {
        setAnchorIndex(index)
        return hasIssue ? prev.filter((id) => id !== issueId) : [...prev, issueId]
      }

      setAnchorIndex(index)
      return hasIssue ? prev.filter((id) => id !== issueId) : [issueId]
    })
  }

  const selectAllIssues = () => {
    setSelectedIssueIds(issues.map((i) => i.id))
  }

  const clearSelectedIssues = () => {
    setSelectedIssueIds([])
    setAnchorIndex(null)
  }

  const toggleTrashDelete = (issueId: string) => {
    setTrashDeleteIds((prev) => (prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]))
  }

  const runFixes = async (policy: ConflictPolicy = conflictPolicy) => {
    if (issues.length === 0) {
      setConfirmOpen(false)
      return
    }

    const selectedIssues = issues
      .filter((issue) => selectedIssueIds.includes(issue.id))
      .map((issue) => {
        if (issue.type === 'misplaced' && issue.reason.includes('trash') && trashDeleteIds.includes(issue.id)) {
          return { ...issue, suggestedTarget: '__DELETE__' }
        }
        return issue
      })
    if (selectedIssues.length === 0) {
      setError('请先选择要修复的文件')
      setConfirmOpen(false)
      return
    }

    setFixing(true)
    setError('')
    try {
      const summary = await invoke<FixSummary>('fix_issues', {
        issues: selectedIssues as AuditIssue[],
        policy,
      })
      setConfirmOpen(false)
      setError(`修复完成：移动 ${summary.moved}，删除 ${summary.deleted}，跳过 ${summary.skipped}`)
      await runScan()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message.includes('CONFLICT')) {
        const choice = window.confirm('检测到重名冲突。确定选择“覆盖”吗？取消将使用“改名共存”。')
        await runFixes(choice ? 'overwriteAll' : 'renameAll')
        return
      }
      setError(`修复失败：${message}`)
    } finally {
      setFixing(false)
      await refreshOps()
    }
  }

  const handleUndoTask = async (taskId: string) => {
    const summary = await invoke<UndoSummary>('undo_task', { taskId })
    if (summary.warnings.length > 0) {
      setError(summary.warnings.join('；'))
    } else {
      setError('任务撤回完成')
    }
    await runScan()
    await refreshOps()
  }

  const handleUndoEntry = async (entryId: string) => {
    const summary = await invoke<UndoSummary>('undo_entry', { entryId })
    if (summary.warnings.length > 0) {
      setError(summary.warnings.join('；'))
    } else {
      setError('文件撤回完成')
    }
    await runScan()
    await refreshOps()
  }

  const handleOpenFile = async (path: string) => {
    try {
      await invoke('open_file', { path })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleOpenFolder = async (path: string) => {
    try {
      await invoke('open_file_parent', { path })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const clearThumbnailCache = async () => {
    const ok = window.confirm('将删除画廊缩略图缓存（.voyager-gallery-cache）下的所有文件，确定继续吗？')
    if (!ok) return

    try {
      const summary = await invoke<{ removed: number; cacheDir: string }>('clear_thumbnail_cache')
      setError(`清除完成：已删除 ${summary.removed} 个缩略图（${summary.cacheDir}）`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="page-wrapper">
      <section className="card">
        <h2 className="card-title">仓库配置</h2>
        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={generateThumbs}
              disabled={loading || fixing}
              onChange={(e) => setGenerateThumbs(e.target.checked)}
            />
            生成画廊缩略图（64 / 256 / 1024px 三级缩略图，会降低扫描速度）
          </label>

          <label htmlFor="vault-path" className="input-label">仓库路径</label>
          <input
            id="vault-path"
            className="input-field"
            list="recent-vaults"
            value={vaultPath}
            onChange={(e) => setVaultPath(e.target.value)}
            placeholder="选择或输入 Obsidian 仓库路径..."
          />
          <datalist id="recent-vaults">
            {recentVaults.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button type="button" className="btn btn-secondary" onClick={pickDirectory}>
            选择目录
          </button>
          <button type="button" className="btn btn-primary" onClick={runScan} disabled={loading || fixing}>
            {loading ? '扫描中...' : '开始扫描'}
          </button>
        </div>
        {error && <div className={error.includes('完成') ? 'alert alert-success' : 'alert alert-error'} role="alert">{error}</div>}
      </section>

      <section className="card">
        <h2 className="card-title">工作原理说明（附件扫描）</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          扫描会遍历仓库中的 Markdown 与 attachments 目录，识别未引用图片（orphan）和错位图片（misplaced），并可执行自动修复。
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">执行修复说明</h2>
        <ul style={{ color: 'var(--text-muted)', paddingLeft: 18 }}>
          <li><strong>orphan</strong>：删除未被任何笔记引用的附件文件（删除后通常不可自动恢复）。</li>
          <li><strong>misplaced</strong>：将附件移动到建议目标路径；遇到重名按冲突策略处理（默认改名共存）。</li>
          <li>执行修复仅会处理你当前选中的项目。</li>
          <li><strong>执行前请先备份仓库</strong>，尤其是批量删除或批量迁移时。</li>
        </ul>
      </section>

      <StatsCards result={result} />

      {resultIsStale && result && (
        <div style={{ margin: '12px 0', padding: '10px 16px', background: 'rgba(255, 180, 0, 0.15)', border: '1px solid rgba(255, 180, 0, 0.4)', borderRadius: 6, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          当前展示的是上次的扫描结果。如果仓库内容已发生变化，建议点击"开始扫描"重新扫描。
        </div>
      )}

      {result && (
        <>
          <section className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={selectAllIssues}>全选</button>
              <button type="button" className="btn btn-secondary" onClick={clearSelectedIssues}>清空选择</button>
              <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)} disabled={fixing}>
                执行修复
              </button>
              <span style={{ color: 'var(--text-muted)' }}>已选择 {selectedIssueIds.length} / {issues.length}</span>
              <span style={{ color: 'var(--text-muted)' }}>支持：普通点击单选、Ctrl 切换、Shift 区间选择</span>
            </div>
          </section>

          <section className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${galleryTab === 'orphan' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setGalleryTab('orphan')}
              >
                Orphan 画廊 ({orphanIssues.length})
              </button>
              <button
                type="button"
                className={`btn ${galleryTab === 'misplaced' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setGalleryTab('misplaced')}
              >
                Misplaced 画廊 ({misplacedIssues.length})
              </button>

              <button type="button" className="btn btn-secondary" onClick={clearThumbnailCache}>
                清除缩略图缓存
              </button>
            </div>

            <div style={{
              marginBottom: 12, padding: '10px 14px',
              background: 'var(--panel-bg)', border: '1px solid var(--border-color)',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: 12, lineHeight: '32px' }}>画廊显示模式：</span>
                {([
                  { value: 'thumbnail' as const, label: '缩略图' },
                  { value: 'rawImage' as const, label: '原图直显' },
                  { value: 'noImage' as const, label: '不显示图片' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => changeDisplayMode(opt.value)}
                    style={{
                      padding: '4px 16px', fontSize: '0.85rem', cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      borderRight: opt.value === 'noImage' ? '1px solid var(--border-color)' : 'none',
                      borderRadius: opt.value === 'thumbnail' ? '6px 0 0 6px' : opt.value === 'noImage' ? '0 6px 6px 0' : '0',
                      background: displayMode === opt.value ? 'var(--accent, #7b61ff)' : 'transparent',
                      color: displayMode === opt.value ? '#fff' : 'inherit',
                      fontWeight: displayMode === opt.value ? 600 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {displayMode === 'thumbnail' && '使用缩略图加载画廊和预览弹窗，性能最佳。点击放大查看时显示的是中等缩略图（1024px），非原始分辨率。'}
                {displayMode === 'rawImage' && '⚠ 画廊和预览弹窗均直接加载原图，可获得最高清晰度，但大量高分辨率图片可能导致内存占用增大和界面卡顿。'}
                {displayMode === 'noImage' && '画廊不加载任何图片，仅显示文件名，适合快速浏览文件列表。点击放大查看时仍可看到原图。'}
              </div>
            </div>

            <VirtualGallery
              issues={galleryTab === 'orphan' ? orphanIssues : misplacedIssues}
              displayMode={displayMode}
              selectedIssueIds={selectedIssueIds}
              issueIndexMap={issueIndexMap}
              toFilePreviewSrc={toFilePreviewSrc}
              getThumbSrc={getThumbSrc}
              onIssueClick={handleIssueRowClick}
              onPreviewClick={setGalleryActionIssue}
            />
          </section>

          <div className="results-wrapper">
            <section className="card">
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className={`btn ${listTab === 'orphan' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setListTab('orphan')}
                >
                  Orphan 问题列表 ({orphanIssues.length})
                </button>
                <button
                  type="button"
                  className={`btn ${listTab === 'misplaced' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setListTab('misplaced')}
                >
                  Misplaced 问题列表 ({misplacedIssues.length})
                </button>
              </div>

              {listTab === 'orphan' ? (
                <IssuesTable
                  title="Orphan 问题列表"
                  mode="orphan"
                  issues={orphanIssues}
                  onOpenFile={handleOpenFile}
                  onOpenFolder={handleOpenFolder}
                  selectedIssueIds={selectedIssueIds}
                  onIssueRowClick={handleIssueRowClick}
                  indexOfIssue={(id) => issueIndexMap.get(id) ?? -1}
                  trashDeleteIds={trashDeleteIds}
                  onToggleTrashDelete={toggleTrashDelete}
                  toFilePreviewSrc={generateThumbs ? toFilePreviewSrc : undefined}
                  onPreviewClick={setGalleryActionIssue}
                />
              ) : (
                <IssuesTable
                  title="Misplaced 问题列表"
                  mode="misplaced"
                  issues={misplacedIssues}
                  onOpenFile={handleOpenFile}
                  onOpenFolder={handleOpenFolder}
                  onOpenMarkdownFile={handleOpenFile}
                  onOpenMarkdownFolder={handleOpenFolder}
                  selectedIssueIds={selectedIssueIds}
                  onIssueRowClick={handleIssueRowClick}
                  indexOfIssue={(id) => issueIndexMap.get(id) ?? -1}
                  trashDeleteIds={trashDeleteIds}
                  onToggleTrashDelete={toggleTrashDelete}
                  toFilePreviewSrc={generateThumbs ? toFilePreviewSrc : undefined}
                  onPreviewClick={setGalleryActionIssue}
                />
              )}
            </section>
          </div>
        </>
      )}

      {galleryActionIssue && (() => {
        const currentList = galleryTab === 'orphan' ? orphanIssues : misplacedIssues
        const currentIdx = currentList.findIndex((i) => i.id === galleryActionIssue.id)
        const hasPrev = currentIdx > 0
        const hasNext = currentIdx < currentList.length - 1
        const goPrev = () => { if (hasPrev) { setGalleryActionIssue(currentList[currentIdx - 1]); setPreviewZoom(null); setPreviewNaturalSize(null) } }
        const goNext = () => { if (hasNext) { setGalleryActionIssue(currentList[currentIdx + 1]); setPreviewZoom(null); setPreviewNaturalSize(null) } }

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 1000,
            }}
            onClick={() => { setGalleryActionIssue(null); setPreviewZoom(null); setPreviewNaturalSize(null) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') goPrev()
              else if (e.key === 'ArrowRight') goNext()
              else if (e.key === 'Escape') { setGalleryActionIssue(null); setPreviewZoom(null); setPreviewNaturalSize(null) }
            }}
            tabIndex={0}
            ref={(el) => el?.focus()}
          >
            {hasPrev && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                style={{
                  position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%',
                  width: 44, height: 44, fontSize: 22, cursor: 'pointer', zIndex: 1001, display: 'grid', placeItems: 'center',
                }}
                aria-label="上一张"
              >
                ‹
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                style={{
                  position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%',
                  width: 44, height: 44, fontSize: 22, cursor: 'pointer', zIndex: 1001, display: 'grid', placeItems: 'center',
                }}
                aria-label="下一张"
              >
                ›
              </button>
            )}
            <div
              style={{
                background: 'var(--panel-bg, #fff)',
                borderRadius: 12,
                padding: 24,
                minWidth: 320,
                maxWidth: '90vw',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: 8, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentIdx + 1} / {currentList.length}
                {previewZoom !== null && previewNaturalSize
                  ? ` · ${Math.round(previewZoom * 100)}%`
                  : ' · 自适应'}
                {' · 滚轮缩放 / 点击切换 / 拖拽平移'}
              </div>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <div
                  ref={(el) => {
                    (previewScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                    (wheelZoomRef as React.MutableRefObject<HTMLDivElement | null>).current = el
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: 400,
                    borderRadius: 8,
                    overflow: previewZoom !== null ? 'auto' : 'hidden',
                    background: '#1111',
                    marginBottom: 12,
                    cursor: dragState.current.dragging
                      ? 'grabbing'
                      : previewZoom !== null
                        ? 'grab'
                        : 'zoom-in',
                  }}
                  onMouseDown={previewZoom !== null ? handlePreviewMouseDown : undefined}
                  onMouseMove={previewZoom !== null ? handlePreviewMouseMove : undefined}
                  onMouseUp={handlePreviewMouseUp}
                  onMouseLeave={handlePreviewMouseUp}
                >
                  {(() => {
                    const imgSrc = displayMode === 'thumbnail' && (galleryActionIssue.thumbnailPaths || galleryActionIssue.thumbnailPath)
                      ? (getThumbSrc(galleryActionIssue, 'medium') || getThumbSrc(galleryActionIssue, 'small'))
                      : toFilePreviewSrc(galleryActionIssue.imagePath)

                    // Fit mode: image fits inside container with object-fit contain
                    // Zoom mode: image rendered at naturalWidth * zoom pixels
                    const isFit = previewZoom === null
                    const imgStyle: React.CSSProperties = isFit
                      ? { maxWidth: '100%', maxHeight: 400, objectFit: 'contain' as const, display: 'block', margin: '0 auto' }
                      : {
                          width: previewNaturalSize ? previewNaturalSize.w * previewZoom : undefined,
                          height: previewNaturalSize ? previewNaturalSize.h * previewZoom : undefined,
                          display: 'block',
                          margin: '0 auto',
                        }

                    return (
                      <img
                        src={imgSrc}
                        alt={galleryActionIssue.imagePath}
                        draggable={false}
                        style={imgStyle}
                        onClick={(e) => {
                          // Only toggle zoom if user didn't drag
                          const ds = dragState.current
                          const dx = Math.abs(e.clientX - ds.startX)
                          const dy = Math.abs(e.clientY - ds.startY)
                          if (dx < 5 && dy < 5) {
                            handlePreviewClick()
                          }
                        }}
                        onLoad={(e) => {
                          const img = e.currentTarget
                          setPreviewNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
                        }}
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          const fallback = document.createElement('div')
                          fallback.textContent = '无法加载图片'
                          fallback.style.cssText = 'padding:24px;color:var(--text-muted);text-align:center'
                          ;(e.currentTarget as HTMLImageElement).parentElement?.appendChild(fallback)
                        }}
                      />
                    )
                  })()}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {galleryActionIssue.imagePath}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void handleOpenFile(galleryActionIssue.imagePath)
                    setGalleryActionIssue(null)
                  }}
                >
                  打开文件
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    void handleOpenFolder(galleryActionIssue.imagePath)
                    setGalleryActionIssue(null)
                  }}
                >
                  打开目录
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => enterFullscreen(galleryActionIssue)}
                >
                  全屏原图
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewZoom(null)}
                >
                  重置缩放
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewZoom(1)}
                  disabled={!previewNaturalSize}
                >
                  100% 原始尺寸
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setGalleryActionIssue(null); setPreviewZoom(null); setPreviewNaturalSize(null) }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <WorkLogPanel logs={logs} />
      <OperationHistoryPanel tasks={tasks} onUndoTask={handleUndoTask} onUndoEntry={handleUndoEntry} />

      {fullscreenIssue && (() => {
        const currentList = galleryTab === 'orphan' ? orphanIssues : misplacedIssues
        const fsIdx = currentList.findIndex((i) => i.id === fullscreenIssue.id)
        const fsPrev = fsIdx > 0 ? currentList[fsIdx - 1] : null
        const fsNext = fsIdx < currentList.length - 1 ? currentList[fsIdx + 1] : null

        const isFit = fsZoom === null
        const imgStyle: React.CSSProperties = isFit
          ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const, display: 'block', margin: 'auto' }
          : {
              width: fsNatural ? fsNatural.w * fsZoom : undefined,
              height: fsNatural ? fsNatural.h * fsZoom : undefined,
              display: 'block', margin: 'auto',
            }

        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', display: 'flex', flexDirection: 'column' }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') exitFullscreen()
              else if (e.key === 'ArrowLeft' && fsPrev) { setFullscreenIssue(fsPrev); setFsZoom(null); setFsNatural(null) }
              else if (e.key === 'ArrowRight' && fsNext) { setFullscreenIssue(fsNext); setFsZoom(null); setFsNatural(null) }
            }}
            tabIndex={0}
            ref={(el) => el?.focus()}
          >
            {/* Top bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px', background: 'rgba(0,0,0,0.6)', flexShrink: 0, zIndex: 1,
            }}>
              <div style={{ color: '#fff', fontSize: '0.85rem', opacity: 0.8 }}>
                {fsIdx >= 0 ? `${fsIdx + 1} / ${currentList.length}` : ''}
                {fsZoom !== null && fsNatural ? ` · ${Math.round(fsZoom * 100)}%` : ' · 自适应'}
                <span style={{ marginLeft: 12, opacity: 0.6 }}>滚轮缩放 / 点击切换 / 拖拽平移 / 方向键切换</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setFsZoom(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  自适应
                </button>
                <button type="button" onClick={() => setFsZoom(1)} disabled={!fsNatural}
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  100%
                </button>
                <button type="button" onClick={exitFullscreen}
                  style={{ background: 'rgba(255,80,80,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  退出全屏 (ESC)
                </button>
              </div>
            </div>

            {/* Image area */}
            <div
              ref={(el) => {
                (fsScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                (fsWheelRef as React.MutableRefObject<HTMLDivElement | null>).current = el
              }}
              style={{
                flex: 1, overflow: isFit ? 'hidden' : 'auto', display: isFit ? 'flex' : 'block',
                alignItems: 'center', justifyContent: 'center',
                cursor: isFit ? 'zoom-in' : 'grab',
              }}
              onMouseDown={(e) => {
                if (e.button !== 0 || isFit) return
                const el = fsScrollRef.current
                if (!el) return
                fsDragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
                e.preventDefault()
              }}
              onMouseMove={(e) => {
                const ds = fsDragState.current
                if (!ds.dragging) return
                const el = fsScrollRef.current
                if (!el) return
                el.scrollLeft = ds.scrollLeft - (e.clientX - ds.startX)
                el.scrollTop = ds.scrollTop - (e.clientY - ds.startY)
              }}
              onMouseUp={() => { fsDragState.current.dragging = false }}
              onMouseLeave={() => { fsDragState.current.dragging = false }}
            >
              <img
                src={toFilePreviewSrc(fullscreenIssue.imagePath)}
                alt={fullscreenIssue.imagePath}
                draggable={false}
                style={imgStyle}
                onClick={(e) => {
                  const ds = fsDragState.current
                  const dx = Math.abs(e.clientX - ds.startX)
                  const dy = Math.abs(e.clientY - ds.startY)
                  if (dx < 5 && dy < 5) {
                    setFsZoom((prev) => (prev === null ? 1 : null))
                  }
                }}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setFsNatural({ w: img.naturalWidth, h: img.naturalHeight })
                }}
              />
            </div>

            {/* Prev/Next arrows */}
            {fsPrev && (
              <button type="button"
                onClick={() => { setFullscreenIssue(fsPrev); setFsZoom(null); setFsNatural(null) }}
                style={{
                  position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '50%',
                  width: 48, height: 48, fontSize: 24, cursor: 'pointer', zIndex: 10001, display: 'grid', placeItems: 'center',
                }}
                aria-label="上一张">‹</button>
            )}
            {fsNext && (
              <button type="button"
                onClick={() => { setFullscreenIssue(fsNext); setFsZoom(null); setFsNatural(null) }}
                style={{
                  position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '50%',
                  width: 48, height: 48, fontSize: 24, cursor: 'pointer', zIndex: 10001, display: 'grid', placeItems: 'center',
                }}
                aria-label="下一张">›</button>
            )}

            {/* Bottom filename */}
            <div style={{
              padding: '6px 16px', background: 'rgba(0,0,0,0.6)', flexShrink: 0,
              color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textAlign: 'center', wordBreak: 'break-all',
            }}>
              {fullscreenIssue.imagePath}
              {fsNatural && <span style={{ marginLeft: 12 }}>{fsNatural.w} × {fsNatural.h} px</span>}
            </div>
          </div>
        )
      })()}

      <ConfirmDialog
        open={confirmOpen}
        title={fixing ? '执行中，请稍候...' : '确认执行修复'}
        onCancel={() => {
          if (!fixing) setConfirmOpen(false)
        }}
        onConfirm={() => {
          void runFixes()
        }}
      />
    </div>
  )
}

export default ScanPage
