import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { open, save } from '@tauri-apps/api/dialog'
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import ConfirmDialog from '../components/ConfirmDialog'
import ContextMenu from '../components/ContextMenu'
import type { MenuItem } from '../components/ContextMenu'
import DetailPanel from '../components/DetailPanel'
import ProgressBar from '../components/ProgressBar'
import Sidebar from '../components/Sidebar'
import StatusBar from '../components/StatusBar'
import Toolbar from '../components/Toolbar'
import VirtualGallery from '../components/VirtualGallery'
import { FILE_TYPE_GROUPS } from '../components/Sidebar'
import type { AuditIssue, ConflictPolicy, GalleryDisplayMode, OperationTask, RuntimeLogLine, ScanResult, SizeFilter } from '../types'
import { scanVault } from '../lib/commands'
import * as exportUtil from '../lib/export'
import * as storage from '../lib/storage'

interface ScanProgress {
  phase: 'collecting' | 'parsing' | 'thumbnails'
  current: number
  total: number
}

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
  onScanComplete?: (result: ScanResult) => void
}

const RECENT_VAULTS_KEY = 'voyager-recent-vaults-v1'
const DISPLAY_MODE_KEY = 'voyager-display-mode-v1'
const LAST_VAULT_KEY = 'voyager-last-vault-v1'
const CACHED_RESULT_KEY = 'voyager-cached-scan-result-v3'

function loadDisplayMode(): GalleryDisplayMode {
  const raw = storage.getItem(DISPLAY_MODE_KEY)
  if (raw === 'rawImage' || raw === 'noImage') return raw
  return 'thumbnail'
}

function loadRecentVaults(): string[] {
  try {
    const raw = storage.getItem(RECENT_VAULTS_KEY)
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
  storage.setItem(RECENT_VAULTS_KEY, JSON.stringify(next))
  storage.setItem(LAST_VAULT_KEY, normalized)
}

function loadLastVault(): string {
  return storage.getItem(LAST_VAULT_KEY) ?? ''
}

function loadCachedResult(): ScanResult | undefined {
  try {
    const raw = storage.getItem(CACHED_RESULT_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as ScanResult
  } catch {
    return undefined
  }
}

function saveCachedResult(result: ScanResult | undefined) {
  if (!result) {
    storage.removeItem(CACHED_RESULT_KEY)
  } else {
    storage.setItem(CACHED_RESULT_KEY, JSON.stringify(result))
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

function ScanPage({ conflictPolicy, onScanComplete }: ScanPageProps) {
  const [vaultPath, setVaultPath] = useState(() => loadLastVault())
  const [recentVaults, setRecentVaults] = useState<string[]>(() => loadRecentVaults())
  const [result, setResult] = useState<ScanResult | undefined>(() => loadCachedResult())
  const [resultIsStale, setResultIsStale] = useState(() => loadCachedResult() !== undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [error, setError] = useState('')
  const [fixing, setFixing] = useState(false)
  const [logs, setLogs] = useState<RuntimeLogLine[]>([])
  const [tasks, setTasks] = useState<OperationTask[]>([])
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set())
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null)
  const [galleryTab, setGalleryTab] = useState<'orphan' | 'misplaced'>('orphan')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fileTypeFilter, setFileTypeFilter] = useState<Set<string>>(() => new Set(FILE_TYPE_GROUPS.map((g) => g.key)))
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all')
  const [focusedIssue, setFocusedIssue] = useState<AuditIssue | null>(null)
  const [trashDeleteIds, setTrashDeleteIds] = useState<string[]>([])
  const [generateThumbs, setGenerateThumbs] = useState(true)
  const [displayMode, setDisplayMode] = useState<GalleryDisplayMode>(() => loadDisplayMode())
  const [galleryActionIssue, setGalleryActionIssue] = useState<AuditIssue | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; issue: AuditIssue } | null>(null)
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

  // Notify parent of cached result on mount
  useEffect(() => {
    if (result) onScanComplete?.(result)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    storage.setItem(DISPLAY_MODE_KEY, mode)
  }

  // Debounce search text (300ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchText])

  const allIssues = result?.issues ?? []

  // Build extension-to-group-key lookup
  const extGroupMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of FILE_TYPE_GROUPS) {
      for (const ext of g.extensions) map.set(ext, g.key)
    }
    return map
  }, [])

  const getExtGroupKey = useCallback((path: string) => {
    const dot = path.lastIndexOf('.')
    if (dot < 0) return 'other'
    const ext = path.slice(dot + 1).toLowerCase()
    return extGroupMap.get(ext) ?? 'other'
  }, [extGroupMap])

  // Compute type counts (before filtering by type/size, so counts stay stable)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const issue of allIssues) {
      const key = getExtGroupKey(issue.imagePath)
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [allIssues, getExtGroupKey])

  const matchesSize = useCallback((issue: AuditIssue) => {
    if (sizeFilter === 'all') return true
    const size = issue.fileSize
    if (size == null) return true // no size info → show anyway
    if (sizeFilter === 'small') return size < 102400
    if (sizeFilter === 'medium') return size >= 102400 && size <= 1048576
    return size > 1048576
  }, [sizeFilter])

  const issues = useMemo(() => {
    let filtered = allIssues
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter((i) => i.imagePath.toLowerCase().includes(lower))
    }
    if (fileTypeFilter.size < FILE_TYPE_GROUPS.length) {
      filtered = filtered.filter((i) => fileTypeFilter.has(getExtGroupKey(i.imagePath)))
    }
    if (sizeFilter !== 'all') {
      filtered = filtered.filter(matchesSize)
    }
    return filtered
  }, [allIssues, debouncedSearch, fileTypeFilter, sizeFilter, getExtGroupKey, matchesSize])

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
    setScanProgress(null)

    const unlisten = await listen<ScanProgress>('scan-progress', (event) => {
      setScanProgress(event.payload)
    })

    try {
      const scanResult = await scanVault(vaultPath, { generateThumbs, thumbSize: 256 })
      setResult(scanResult)
      saveCachedResult(scanResult)
      setResultIsStale(false)
      onScanComplete?.(scanResult)
      setSelectedIssueIds(new Set())
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
      unlisten()
      setScanProgress(null)
      setLoading(false)
    }
  }

  const handleIssueRowClick = (
    issueId: string,
    index: number,
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
  ) => {
    const clicked = issues.find((i) => i.id === issueId) ?? null
    setFocusedIssue(clicked)
    setSelectedIssueIds((prev) => {
      const hasIssue = prev.has(issueId)

      if (event.shiftKey && anchorIndex !== null && issues.length > 0) {
        const from = Math.min(anchorIndex, index)
        const to = Math.max(anchorIndex, index)
        return new Set(issues.slice(from, to + 1).map((i) => i.id))
      }

      if (event.ctrlKey || event.metaKey) {
        setAnchorIndex(index)
        const next = new Set(prev)
        if (hasIssue) next.delete(issueId); else next.add(issueId)
        return next
      }

      setAnchorIndex(index)
      return hasIssue ? new Set<string>() : new Set([issueId])
    })
  }

  const selectAllIssues = () => {
    setSelectedIssueIds(new Set(issues.map((i) => i.id)))
  }

  const clearSelectedIssues = () => {
    setSelectedIssueIds(new Set())
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
      .filter((issue) => selectedIssueIds.has(issue.id))
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

  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
    const ext = { json: 'json', csv: 'csv', markdown: 'md' }[format]
    const path = await save({
      defaultPath: `voyager-report.${ext}`,
      filters: [{ name: format.toUpperCase(), extensions: [ext] }],
    })
    if (!path) return
    const content = format === 'json'
      ? exportUtil.toJSON(issues)
      : format === 'csv'
        ? exportUtil.toCSV(issues)
        : exportUtil.toMarkdown(issues)
    try {
      await invoke('write_text_file', { path, content })
      setError(`导出完成：${path}`)
    } catch (e) {
      setError(`导出失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleCardContextMenu = useCallback((issue: AuditIssue, x: number, y: number) => {
    setCtxMenu({ x, y, issue })
  }, [])

  const ctxMenuItems: MenuItem[] = ctxMenu ? [
    { label: '打开文件', onClick: () => handleOpenFile(ctxMenu.issue.imagePath) },
    { label: '打开目录', onClick: () => handleOpenFolder(ctxMenu.issue.imagePath) },
    { label: '复制路径', onClick: () => { void navigator.clipboard.writeText(ctxMenu.issue.imagePath) } },
    { label: '全屏查看', onClick: () => enterFullscreen(ctxMenu.issue) },
    {
      label: selectedIssueIds.has(ctxMenu.issue.id) ? '取消选中' : '选中',
      onClick: () => {
        const id = ctxMenu.issue.id
        setSelectedIssueIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id); else next.add(id)
          return next
        })
      },
    },
  ] : []

  const currentGalleryIssues = galleryTab === 'orphan' ? orphanIssues : misplacedIssues

  return (
    <div className="scan-layout">
      <Toolbar
        vaultPath={vaultPath}
        onVaultPathChange={setVaultPath}
        recentVaults={recentVaults}
        onPickDirectory={pickDirectory}
        onScan={runScan}
        scanning={loading}
        fixing={fixing}
        displayMode={displayMode}
        onDisplayModeChange={changeDisplayMode}
        hasResult={!!result}
        selectedCount={selectedIssueIds.size}
        totalCount={issues.length}
        onSelectAll={selectAllIssues}
        onClearSelection={clearSelectedIssues}
        onFix={() => setConfirmOpen(true)}
        onExport={handleExport}
        generateThumbs={generateThumbs}
        onGenerateThumbsChange={setGenerateThumbs}
      />

      <ProgressBar progress={scanProgress} visible={loading} />

      {error && (
        <div style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
          <div className={error.includes('完成') ? 'alert alert-success' : 'alert alert-error'} role="alert" style={{ margin: 0 }}>{error}</div>
        </div>
      )}

      {resultIsStale && result && (
        <div style={{ padding: '4px 12px', fontSize: '0.78rem', background: 'var(--warning-bg)', color: 'var(--text-muted)', borderBottom: '1px solid var(--warning-border)' }}>
          当前展示的是上次的扫描结果。如果仓库内容已发生变化，建议重新扫描。
        </div>
      )}

      <div className="scan-panels">
        <Sidebar
          category={galleryTab}
          onCategoryChange={setGalleryTab}
          orphanCount={orphanIssues.length}
          misplacedCount={misplacedIssues.length}
          searchText={searchText}
          onSearchChange={setSearchText}
          fileTypeFilter={fileTypeFilter}
          onFileTypeFilterChange={setFileTypeFilter}
          typeCounts={typeCounts}
          sizeFilter={sizeFilter}
          onSizeFilterChange={setSizeFilter}
        />

        <main className="scan-gallery">
          <VirtualGallery
            issues={currentGalleryIssues}
            displayMode={displayMode}
            selectedIssueIds={selectedIssueIds}
            issueIndexMap={issueIndexMap}
            toFilePreviewSrc={toFilePreviewSrc}
            getThumbSrc={getThumbSrc}
            onIssueClick={handleIssueRowClick}
            onPreviewClick={setGalleryActionIssue}
            onContextMenu={handleCardContextMenu}
          />
        </main>

        <DetailPanel
          issue={focusedIssue}
          selectedCount={selectedIssueIds.size}
          toFilePreviewSrc={toFilePreviewSrc}
          getThumbSrc={getThumbSrc}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onFullscreen={enterFullscreen}
        />
      </div>

      <StatusBar
        orphanCount={orphanIssues.length}
        misplacedCount={misplacedIssues.length}
        selectedCount={selectedIssueIds.size}
        totalCount={issues.length}
        logs={logs}
        scanning={loading}
        tasks={tasks}
        onUndoTask={handleUndoTask}
        onUndoEntry={handleUndoEntry}
        onClearThumbnailCache={clearThumbnailCache}
      />

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
              background: 'var(--overlay-bg)',
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
                  background: 'var(--overlay-bg)', color: '#fff', border: 'none', borderRadius: '50%',
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
                  background: 'var(--overlay-bg)', color: '#fff', border: 'none', borderRadius: '50%',
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
                boxShadow: '0 8px 32px var(--shadow)',
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
                    background: 'var(--placeholder-bg)',
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

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenuItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}

export default ScanPage
