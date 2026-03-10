import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { open, save } from '@tauri-apps/api/dialog'
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { appWindow } from '@tauri-apps/api/window'
import { useLang } from '../App'
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
import type { AuditIssue, ConflictPolicy, ConvertSummary, DuplicateGroup, GalleryDisplayMode, MergeSummary, OperationTask, RuntimeLogLine, ScanResult, SizeFilter } from '../types'
import { scanVault, openVaultFile, openVaultFileParent } from '../lib/commands'
import { filterIssues, type FilterParams, getExtGroupKey } from '../lib/filterUtils'
import * as exportUtil from '../lib/export'
import * as storage from '../lib/storage'
import FilterWorker from '../workers/filterWorker?worker'

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

interface ScanPageProps {
  conflictPolicy: ConflictPolicy
  onScanComplete?: (result: ScanResult, vaultPath: string) => void
}

const RECENT_VAULTS_KEY = 'voyager-recent-vaults-v1'
const DISPLAY_MODE_KEY = 'voyager-display-mode-v1'
const LAST_VAULT_KEY = 'voyager-last-vault-v1'
const CACHED_RESULT_KEY = 'voyager-cached-scan-result-v5'

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
    // Exclude allImages from cache to control localStorage size
    const { allImages: _, ...cacheable } = result
    storage.setItem(CACHED_RESULT_KEY, JSON.stringify(cacheable))
  }
}

function toFilePreviewSrc(path: string, bustCache?: string) {
  const normalized = path.split('\\').join('/')
  const src = convertFileSrc(normalized)
  return bustCache ? `${src}?v=${bustCache}` : src
}

function ScanPage({ conflictPolicy, onScanComplete }: ScanPageProps) {
  const tr = useLang()
  const [vaultPath, setVaultPath] = useState(() => loadLastVault())
  const [recentVaults, setRecentVaults] = useState<string[]>(() => loadRecentVaults())
  const [result, setResult] = useState<ScanResult | undefined>(() => loadCachedResult())
  const [resultIsStale, setResultIsStale] = useState(() => loadCachedResult() !== undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false)
  const [scanVersion, setScanVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [error, setError] = useState('')
  const [fixing, setFixing] = useState(false)
  const [logs, setLogs] = useState<RuntimeLogLine[]>([])
  const [tasks, setTasks] = useState<OperationTask[]>([])
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set())
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null)
  const [galleryTab, setGalleryTab] = useState<'orphan' | 'misplaced' | 'broken'>('orphan')
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
  const [renameIssue, setRenameIssue] = useState<AuditIssue | null>(null)
  const [renameNewName, setRenameNewName] = useState('')
  const [renaming, setRenaming] = useState(false)

  // Feature: Duplicate detection
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[] | null>(null)
  const [dupFinding, setDupFinding] = useState(false)
  const [dupKeepMap, setDupKeepMap] = useState<Record<string, string>>({}) // hash -> absPath to keep
  const [dupMerging, setDupMerging] = useState(false)

  // Feature: Convert format
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertFormat, setConvertFormat] = useState<'webp' | 'jpeg'>('webp')
  const [convertQuality, setConvertQuality] = useState(80)
  const [convertScope, setConvertScope] = useState<'all' | 'selected'>('all')
  const [converting, setConverting] = useState(false)

  // Sidebar search ref for Ctrl+F focus
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Stable cache-busted image helpers — scanVersion changes after each scan
  const bustKey = String(scanVersion)
  const fileSrc = useCallback((path: string) => toFilePreviewSrc(path, bustKey), [bustKey])
  const getThumbSrc = useCallback((issue: AuditIssue, size: 'tiny' | 'small' | 'medium'): string => {
    const path = issue.thumbnailPaths?.[size] ?? (size === 'small' ? issue.thumbnailPath : undefined)
    return path ? toFilePreviewSrc(path, bustKey) : ''
  }, [bustKey])

  // Notify parent of cached result on mount
  useEffect(() => {
    if (result) onScanComplete?.(result, vaultPath)
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

  // Build extension-to-group-key lookup (Record for Worker compat)
  const extGroupMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of FILE_TYPE_GROUPS) {
      for (const ext of g.extensions) map[ext] = g.key
    }
    return map
  }, [])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const issue of allIssues) {
      const key = getExtGroupKey(issue.imagePath, extGroupMap)
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [allIssues, extGroupMap])

  // --- Hybrid sync/Worker filtering ---
  const WORKER_THRESHOLD = 5000
  const workerRef = useRef<Worker | null>(null)
  const workerReqIdRef = useRef(0)
  const [workerPending, setWorkerPending] = useState(false)
  const [workerFilteredIssues, setWorkerFilteredIssues] = useState<AuditIssue[] | null>(null)

  useEffect(() => {
    try {
      const w = new FilterWorker()
      w.onmessage = (e: MessageEvent<{ requestId?: number; issues: AuditIssue[] }>) => {
        if (e.data.requestId !== workerReqIdRef.current) return
        setWorkerPending(false)
        setWorkerFilteredIssues(e.data.issues)
      }
      workerRef.current = w
      return () => w.terminate()
    } catch {
      // Worker not available (e.g. jsdom test environment) — sync fallback only
    }
  }, [])

  // Sync path (small datasets, or when Worker unavailable)
  const syncFilteredIssues = useMemo(() => {
    if (allIssues.length >= WORKER_THRESHOLD && workerRef.current) return null
    return filterIssues({
      issues: allIssues,
      search: debouncedSearch,
      fileTypeFilter: Array.from(fileTypeFilter),
      totalTypeGroups: FILE_TYPE_GROUPS.length,
      sizeFilter,
      extGroupMap,
    })
  }, [allIssues, debouncedSearch, fileTypeFilter, sizeFilter, extGroupMap])

  // Worker path (large datasets)
  useEffect(() => {
    if (allIssues.length < WORKER_THRESHOLD) {
      setWorkerPending(false)
      setWorkerFilteredIssues(null)
      return
    }
    const params: FilterParams = {
      requestId: workerReqIdRef.current + 1,
      issues: allIssues,
      search: debouncedSearch,
      fileTypeFilter: Array.from(fileTypeFilter),
      totalTypeGroups: FILE_TYPE_GROUPS.length,
      sizeFilter,
      extGroupMap,
    }
    workerReqIdRef.current = params.requestId ?? workerReqIdRef.current
    setWorkerPending(true)
    workerRef.current?.postMessage(params)
  }, [allIssues, debouncedSearch, fileTypeFilter, sizeFilter, extGroupMap])

  const useWorker = allIssues.length >= WORKER_THRESHOLD && workerRef.current !== null
  const issues = useWorker
    ? (workerFilteredIssues ?? syncFilteredIssues ?? allIssues)
    : (syncFilteredIssues ?? allIssues)

  const orphanIssues = issues.filter((i) => i.type === 'orphan')
  const misplacedIssues = issues.filter((i) => i.type === 'misplaced')
  const brokenIssues = issues.filter((i) => i.type === 'broken')

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
      setError(tr.scanErrorNoVault)
      return
    }

    setLoading(true)
    setError('')
    setScanProgress(null)

    const unlisten = await listen<ScanProgress>('scan-progress', (event) => {
      setScanProgress(event.payload)
    })

    try {
      const prevIndex = result?.scanIndex
      const scanResult = await scanVault(vaultPath, { generateThumbs, thumbSize: 256, prevIndex })
      setResult(scanResult)
      saveCachedResult(scanResult)
      setResultIsStale(false)
      setScanVersion((v) => v + 1)
      onScanComplete?.(scanResult, vaultPath)
      setSelectedIssueIds(new Set())
      setAnchorIndex(null)
      setTrashDeleteIds([])
      saveRecentVault(vaultPath)
      setRecentVaults(loadRecentVaults())
      await refreshOps()
    } catch (e) {
      setResult(undefined)
      saveCachedResult(undefined)
      setError(e instanceof Error ? e.message : tr.scanErrorFailed)
    } finally {
      if (typeof unlisten === 'function') {
        unlisten()
      }
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
      setError(tr.scanErrorNoSelection)
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
      setError(tr.scanFixComplete.replace('{moved}', String(summary.moved)).replace('{deleted}', String(summary.deleted)).replace('{skipped}', String(summary.skipped)))
      await runScan()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message.includes('CONFLICT')) {
        const choice = window.confirm(tr.scanConflictPrompt)
        await runFixes(choice ? 'overwriteAll' : 'renameAll')
        return
      }
      setError(tr.scanFixFailed.replace('{message}', message))
    } finally {
      setFixing(false)
      await refreshOps()
    }
  }

  const handleOpenFile = async (path: string) => {
    if (!vaultPath.trim()) {
      setError(tr.scanErrorNoVault)
      return
    }
    try {
      await openVaultFile(path, vaultPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleOpenFolder = async (path: string) => {
    if (!vaultPath.trim()) {
      setError(tr.scanErrorNoVault)
      return
    }
    try {
      await openVaultFileParent(path, vaultPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const clearThumbnailCache = () => {
    setClearCacheConfirmOpen(true)
  }

  const executeClearThumbnailCache = async () => {
    setClearCacheConfirmOpen(false)
    try {
      const summary = await invoke<{ removed: number; cacheDir: string }>('clear_thumbnail_cache')
      const realCount = Math.ceil(summary.removed / 3)
      setScanVersion((v) => v + 1)
      setError(tr.scanClearCacheDone.replace('{removed}', String(summary.removed)).replace('{cacheDir}', summary.cacheDir).replace('{realCount}', String(realCount)))
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
      setError(tr.scanExportDone.replace('{path}', path))
    } catch (e) {
      setError(tr.scanExportFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
    }
  }

  const handleBackup = async (mode: 'directory' | 'zip') => {
    const selectedPaths = allIssues
      .filter((i) => selectedIssueIds.has(i.id))
      .map((i) => i.imagePath)

    if (selectedPaths.length === 0) {
      setError(tr.scanBackupNoSelection)
      return
    }

    if (mode === 'directory') {
      const dest = await open({ directory: true, multiple: false })
      if (typeof dest !== 'string') return
      try {
        const summary = await invoke<{ copied: number; skipped: number; dest: string }>(
          'backup_selected_files', { paths: selectedPaths, dest, vaultPath }
        )
        setError(tr.scanBackupDone
          .replace('{copied}', String(summary.copied))
          .replace('{skipped}', String(summary.skipped))
          .replace('{dest}', summary.dest))
        await refreshOps()
      } catch (e) {
        setError(tr.scanBackupFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
      }
    } else {
      const dest = await save({
        defaultPath: 'voyager-backup.zip',
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      })
      if (!dest) return
      try {
        const summary = await invoke<{ copied: number; skipped: number; dest: string }>(
          'backup_selected_zip', { paths: selectedPaths, dest, vaultPath }
        )
        setError(tr.scanBackupDone
          .replace('{copied}', String(summary.copied))
          .replace('{skipped}', String(summary.skipped))
          .replace('{dest}', summary.dest))
        await refreshOps()
      } catch (e) {
        setError(tr.scanBackupFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
      }
    }
  }

  const handleRename = async () => {
    if (!renameIssue || !renameNewName.trim() || !vaultPath) return
    setRenaming(true)
    try {
      const summary = await invoke<{ mdUpdated: number }>('rename_image', {
        oldPath: renameIssue.imagePath,
        newName: renameNewName.trim(),
        vaultRoot: vaultPath,
        mdRefs: result?.scanIndex.mdRefs ?? {},
      })
      setError(tr.scanRenameDone.replace('{count}', String(summary.mdUpdated)))
      setRenameIssue(null)
      setRenameNewName('')
      await runScan()
    } catch (e) {
      setError(tr.scanRenameFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
    } finally {
      setRenaming(false)
    }
  }

  // --- Feature 1: Backup All ---
  const handleBackupAll = async (mode: 'directory' | 'zip') => {
    const allPaths = allIssues
      .filter((i) => i.type !== 'broken')
      .map((i) => i.imagePath)

    if (allPaths.length === 0) {
      setError(tr.scanBackupNoSelection)
      return
    }

    if (mode === 'directory') {
      const dest = await open({ directory: true, multiple: false })
      if (typeof dest !== 'string') return
      try {
        const summary = await invoke<{ copied: number; skipped: number; dest: string }>(
          'backup_selected_files', { paths: allPaths, dest, vaultPath }
        )
        setError(tr.scanBackupDone
          .replace('{copied}', String(summary.copied))
          .replace('{skipped}', String(summary.skipped))
          .replace('{dest}', summary.dest))
        await refreshOps()
      } catch (e) {
        setError(tr.scanBackupFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
      }
    } else {
      const dest = await save({
        defaultPath: 'voyager-backup-all.zip',
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      })
      if (!dest) return
      try {
        const summary = await invoke<{ copied: number; skipped: number; dest: string }>(
          'backup_selected_zip', { paths: allPaths, dest, vaultPath }
        )
        setError(tr.scanBackupDone
          .replace('{copied}', String(summary.copied))
          .replace('{skipped}', String(summary.skipped))
          .replace('{dest}', summary.dest))
        await refreshOps()
      } catch (e) {
        setError(tr.scanBackupFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
      }
    }
  }

  // --- Feature 2: Find Duplicates ---
  const handleFindDuplicates = async () => {
    if (!vaultPath.trim()) { setError(tr.scanErrorNoVault); return }
    setDupFinding(true)
    setError('')
    try {
      const groups = await invoke<DuplicateGroup[]>('find_duplicates', { vaultPath })
      setDupGroups(groups)
      // Auto-select first file in each group as "keep"
      const keepMap: Record<string, string> = {}
      for (const g of groups) {
        if (g.files.length > 0) keepMap[g.hash] = g.files[0].absPath
      }
      setDupKeepMap(keepMap)
    } catch (e) {
      setError(tr.dupMergeFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
    } finally {
      setDupFinding(false)
    }
  }

  const handleMergeDuplicates = async () => {
    if (!dupGroups || !vaultPath.trim()) return
    setDupMerging(true)
    setError('')
    let totalMds = 0
    let totalFiles = 0
    try {
      for (const g of dupGroups) {
        const keep = dupKeepMap[g.hash]
        if (!keep) continue
        const remove = g.files.filter((f) => f.absPath !== keep).map((f) => f.absPath)
        if (remove.length === 0) continue
        const summary = await invoke<MergeSummary>('merge_duplicates', { keep, remove, vaultPath })
        totalMds += summary.updatedMds
        totalFiles += summary.deletedFiles
      }
      setError(tr.dupMergeDone.replace('{mds}', String(totalMds)).replace('{files}', String(totalFiles)))
      setDupGroups(null)
      await runScan()
    } catch (e) {
      setError(tr.dupMergeFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
    } finally {
      setDupMerging(false)
    }
  }

  // --- Feature 3: Convert Format ---
  const handleConvert = async () => {
    if (!vaultPath.trim()) { setError(tr.scanErrorNoVault); return }
    setConverting(true)
    setError('')
    try {
      let paths: string[]
      if (convertScope === 'selected') {
        paths = allIssues
          .filter((i) => selectedIssueIds.has(i.id) && i.type !== 'broken')
          .map((i) => i.imagePath)
      } else {
        // All images from scan result
        paths = (result?.allImages ?? []).map((a) => a.path)
        if (paths.length === 0) {
          paths = allIssues.filter((i) => i.type !== 'broken').map((i) => i.imagePath)
        }
      }
      const summary = await invoke<ConvertSummary>('convert_images', {
        paths,
        targetFormat: convertFormat,
        quality: convertQuality,
        vaultPath,
      })
      setError(tr.convertDone
        .replace('{converted}', String(summary.converted))
        .replace('{skipped}', String(summary.skipped))
        .replace('{saved}', exportUtil.formatSize(summary.savedBytes)))
      setConvertOpen(false)
      await runScan()
    } catch (e) {
      setError(tr.convertFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
    } finally {
      setConverting(false)
    }
  }

  // --- Feature 5: Drag-to-fix broken (handler passed to DetailPanel) ---
  const handleDropFixBroken = async (files: FileList, issue: AuditIssue) => {
    if (!issue.mdPath || !vaultPath.trim() || files.length === 0) return
    setError('')
    try {
      // Use the Tauri file drop path from the event
      // In Tauri v1 we can't get the full path from browser FileList directly,
      // so we pass filename and let the backend handle it
      const droppedPath = (files[0] as File & { path?: string }).path
      if (!droppedPath) {
        setError(tr.detailDropFixFailed.replace('{message}', 'Cannot read file path from drop event'))
        return
      }
      const result = await invoke<string>('fix_broken_with_file', {
        droppedFilePath: droppedPath,
        brokenImageName: issue.imagePath,
        mdPath: issue.mdPath,
        vaultPath,
      })
      setError(tr.detailDropFixDone.replace('{path}', result))
      await runScan()
    } catch (e) {
      setError(tr.detailDropFixFailed.replace('{message}', e instanceof Error ? e.message : String(e)))
    }
  }

  // --- Feature 6: Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+F → focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Delete → delete selected (open confirm)
      if (e.key === 'Delete' && selectedIssueIds.size > 0 && !fixing && !loading) {
        e.preventDefault()
        setConfirmOpen(true)
      }
      // Ctrl+A → select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
        // Only if not in an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          selectAllIssues()
        }
      }
      // Escape → close overlays
      if (e.key === 'Escape') {
        if (renameIssue) { setRenameIssue(null); return }
        if (dupGroups) { setDupGroups(null); return }
        if (convertOpen) { setConvertOpen(false); return }
        if (galleryActionIssue) { setGalleryActionIssue(null); setPreviewZoom(null); setPreviewNaturalSize(null); return }
        if (fullscreenIssue) { exitFullscreen(); return }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedIssueIds.size, fixing, loading, renameIssue, dupGroups, convertOpen, galleryActionIssue, fullscreenIssue, exitFullscreen])

  const handleCardContextMenu = useCallback((issue: AuditIssue, x: number, y: number) => {
    setCtxMenu({ x, y, issue })
  }, [])

  const ctxMenuItems: MenuItem[] = ctxMenu ? [
    ...(ctxMenu.issue.type !== 'broken' ? [
      { label: tr.scanCtxOpenFile, onClick: () => handleOpenFile(ctxMenu.issue.imagePath) },
      { label: tr.scanCtxOpenFolder, onClick: () => handleOpenFolder(ctxMenu.issue.imagePath) },
    ] : []),
    ...(ctxMenu.issue.type === 'broken' && ctxMenu.issue.mdPath ? [
      { label: tr.scanCtxOpenRefNote, onClick: () => handleOpenFile(ctxMenu.issue.mdPath!) },
      { label: tr.scanCtxOpenRefNoteFolder, onClick: () => handleOpenFolder(ctxMenu.issue.mdPath!) },
    ] : []),
    { label: tr.scanCtxCopyPath, onClick: () => { void navigator.clipboard.writeText(ctxMenu.issue.type === 'broken' ? (ctxMenu.issue.mdPath ?? ctxMenu.issue.imagePath) : ctxMenu.issue.imagePath) } },
    ...(ctxMenu.issue.type !== 'broken' ? [
      { label: tr.scanCtxFullscreen, onClick: () => enterFullscreen(ctxMenu.issue) },
    ] : []),
    ...(ctxMenu.issue.type !== 'broken' ? [
      { label: tr.scanCtxRename, onClick: () => {
        const path = ctxMenu.issue.imagePath
        const parts = path.split(/[/\\]/)
        setRenameNewName(parts[parts.length - 1] || path)
        setRenameIssue(ctxMenu.issue)
      }},
    ] : []),
    {
      label: selectedIssueIds.has(ctxMenu.issue.id) ? tr.scanCtxDeselect : tr.scanCtxSelect,
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

  const currentGalleryIssues = galleryTab === 'orphan' ? orphanIssues : galleryTab === 'misplaced' ? misplacedIssues : brokenIssues

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
        onBackup={handleBackup}
        onBackupAll={handleBackupAll}
        onFindDuplicates={handleFindDuplicates}
        onConvert={() => setConvertOpen(true)}
        generateThumbs={generateThumbs}
        onGenerateThumbsChange={setGenerateThumbs}
      />

      <ProgressBar progress={scanProgress} visible={loading} />

      {error && (
        <div style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
          <div className={error.includes('完成') || error.includes('complete') || error.includes('Complete') || error.includes('cleared') || error.includes('Cleared') ? 'alert alert-success' : 'alert alert-error'} role="alert" style={{ margin: 0 }}>{error}</div>
        </div>
      )}

      {resultIsStale && result && (
        <div style={{ padding: '4px 12px', fontSize: '0.78rem', background: 'var(--warning-bg)', color: 'var(--text-muted)', borderBottom: '1px solid var(--warning-border)' }}>
          {tr.scanStaleResult}
        </div>
      )}

      <div style={{ padding: '8px 12px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        {tr.scanOverviewGuide}
      </div>

      <div className="scan-panels">
        <Sidebar
          category={galleryTab}
          onCategoryChange={setGalleryTab}
          orphanCount={orphanIssues.length}
          misplacedCount={misplacedIssues.length}
          brokenCount={brokenIssues.length}
          searchText={searchText}
          onSearchChange={setSearchText}
          fileTypeFilter={fileTypeFilter}
          onFileTypeFilterChange={setFileTypeFilter}
          typeCounts={typeCounts}
          sizeFilter={sizeFilter}
          onSizeFilterChange={setSizeFilter}
          searchInputRef={searchInputRef}
        />

        <main className="scan-gallery">
          {galleryTab === 'broken' && currentGalleryIssues.length > 0 && (
            <div className="broken-hint-banner">{tr.brokenHint}</div>
          )}
          <VirtualGallery
            issues={currentGalleryIssues}
            displayMode={displayMode}
            selectedIssueIds={selectedIssueIds}
            issueIndexMap={issueIndexMap}
            toFilePreviewSrc={fileSrc}
            getThumbSrc={getThumbSrc}
            onIssueClick={handleIssueRowClick}
            onPreviewClick={setGalleryActionIssue}
            onContextMenu={handleCardContextMenu}
          />
        </main>

        <DetailPanel
          issue={focusedIssue}
          selectedCount={selectedIssueIds.size}
          toFilePreviewSrc={fileSrc}
          getThumbSrc={getThumbSrc}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onFullscreen={enterFullscreen}
          onRename={(issue) => {
            const parts = issue.imagePath.split(/[/\\]/)
            setRenameNewName(parts[parts.length - 1] || issue.imagePath)
            setRenameIssue(issue)
          }}
          onDropFixBroken={handleDropFixBroken}
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
        onClearThumbnailCache={clearThumbnailCache}
      />

      {galleryActionIssue && (() => {
        const currentList = galleryTab === 'orphan' ? orphanIssues : galleryTab === 'misplaced' ? misplacedIssues : brokenIssues
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
                aria-label={tr.scanPrevImage}
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
                aria-label={tr.scanNextImage}
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
                  : ` · ${tr.scanPreviewFit}`}
                {` · ${tr.scanPreviewHint}`}
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
                      : fileSrc(galleryActionIssue.imagePath)

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
                          fallback.textContent = tr.scanPreviewLoadFailed
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
                  {tr.scanPreviewOpenFile}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    void handleOpenFolder(galleryActionIssue.imagePath)
                    setGalleryActionIssue(null)
                  }}
                >
                  {tr.scanPreviewOpenFolder}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => enterFullscreen(galleryActionIssue)}
                >
                  {tr.scanPreviewFullscreenRaw}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewZoom(null)}
                >
                  {tr.scanPreviewResetZoom}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewZoom(1)}
                  disabled={!previewNaturalSize}
                >
                  {tr.scanPreviewOriginalSize}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setGalleryActionIssue(null); setPreviewZoom(null); setPreviewNaturalSize(null) }}
                >
                  {tr.scanPreviewCancel}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {fullscreenIssue && (() => {
        const currentList = galleryTab === 'orphan' ? orphanIssues : galleryTab === 'misplaced' ? misplacedIssues : brokenIssues
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
                {fsZoom !== null && fsNatural ? ` · ${Math.round(fsZoom * 100)}%` : ` · ${tr.scanFsAdaptive}`}
                <span style={{ marginLeft: 12, opacity: 0.6 }}>{tr.scanFsHint}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setFsZoom(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {tr.scanFsAdaptive}
                </button>
                <button type="button" onClick={() => setFsZoom(1)} disabled={!fsNatural}
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  100%
                </button>
                <button type="button" onClick={exitFullscreen}
                  style={{ background: 'rgba(255,80,80,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  {tr.scanFsExitFullscreen}
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
                src={fileSrc(fullscreenIssue.imagePath)}
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
                aria-label={tr.scanPrevImage}>‹</button>
            )}
            {fsNext && (
              <button type="button"
                onClick={() => { setFullscreenIssue(fsNext); setFsZoom(null); setFsNatural(null) }}
                style={{
                  position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '50%',
                  width: 48, height: 48, fontSize: 24, cursor: 'pointer', zIndex: 10001, display: 'grid', placeItems: 'center',
                }}
                aria-label={tr.scanNextImage}>›</button>
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
        title={fixing ? tr.scanConfirmTitleFixing : tr.scanConfirmTitle}
        body={!fixing ? (
          <div style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            <p>{tr.scanConfirmBody1}</p>
            <p>{tr.scanConfirmBody2}</p>
          </div>
        ) : undefined}
        onCancel={() => {
          if (!fixing) setConfirmOpen(false)
        }}
        onConfirm={() => {
          void runFixes()
        }}
      />

      <ConfirmDialog
        open={clearCacheConfirmOpen}
        title={tr.scanClearCacheConfirmTitle}
        body={
          <div style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            <p>{tr.scanClearCacheConfirmBody}</p>
            <p style={{ fontSize: '0.85em', opacity: 0.8 }}>{tr.scanClearCacheNote}</p>
          </div>
        }
        onCancel={() => setClearCacheConfirmOpen(false)}
        onConfirm={() => { void executeClearThumbnailCache() }}
      />

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenuItems}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {renameIssue && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'grid', placeItems: 'center', zIndex: 1200 }}
          onClick={() => setRenameIssue(null)}
        >
          <div
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 24, minWidth: 380, maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>{tr.scanRenameTitle}</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              {tr.scanRenameCurrentName}: <strong>{(() => { const p = renameIssue.imagePath.split(/[/\\]/); return p[p.length - 1] || renameIssue.imagePath })()}</strong>
            </div>
            <input
              type="text"
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              placeholder={tr.scanRenameNewPlaceholder}
              style={{ width: '100%', padding: '6px 10px', fontSize: '0.9rem', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-main)', boxSizing: 'border-box', marginBottom: 12 }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !renaming) { void handleRename() } }}
              autoFocus
            />
            {result?.scanIndex.mdRefs && (() => {
              const oldFilename = (() => { const p = renameIssue.imagePath.split(/[/\\]/); return p[p.length - 1] || renameIssue.imagePath })()
              const affectedMds = Object.entries(result.scanIndex.mdRefs)
                .filter(([, refs]) => refs.includes(oldFilename))
                .map(([mdPath]) => mdPath)
              return affectedMds.length > 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, maxHeight: 120, overflowY: 'auto' }}>
                  <div style={{ marginBottom: 4 }}>{tr.scanRenameAffectedMds.replace('{count}', String(affectedMds.length))}</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {affectedMds.map((md) => <li key={md} style={{ wordBreak: 'break-all' }}>{md}</li>)}
                  </ul>
                </div>
              ) : null
            })()}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-sm" onClick={() => setRenameIssue(null)}>{tr.confirmCancel}</button>
              <button type="button" className="btn-sm btn-primary" onClick={() => { void handleRename() }} disabled={renaming || !renameNewName.trim()}>
                {renaming ? '...' : tr.confirmOk}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Duplicate Groups Panel */}
      {dupGroups && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'grid', placeItems: 'center', zIndex: 1200 }}
          onClick={() => setDupGroups(null)}
        >
          <div
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 24, minWidth: 500, maxWidth: '80vw', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>{tr.dupTitle}</h3>
            {dupGroups.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>{tr.dupNoGroups}</p>
            ) : (
              <>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  {tr.dupGroupCount.replace('{count}', String(dupGroups.length))}
                </div>
                {dupGroups.map((g) => (
                  <div key={g.hash} style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>SHA-256: {g.hash.slice(0, 16)}...</div>
                    {g.files.map((f) => (
                      <label key={f.absPath} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`dup-${g.hash}`}
                          checked={dupKeepMap[g.hash] === f.absPath}
                          onChange={() => setDupKeepMap((prev) => ({ ...prev, [g.hash]: f.absPath }))}
                        />
                        <span style={{ flex: 1, wordBreak: 'break-all' }}>{f.absPath}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {f.fileSize > 1024 * 1024 ? `${(f.fileSize / (1024 * 1024)).toFixed(1)} MB` : `${(f.fileSize / 1024).toFixed(1)} KB`}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {tr.dupRefCount.replace('{count}', String(f.refCount))}
                        </span>
                        {dupKeepMap[g.hash] === f.absPath && (
                          <span style={{ color: 'var(--success-color, #4caf50)', fontWeight: 600, fontSize: '0.75rem' }}>{tr.dupKeepLabel}</span>
                        )}
                      </label>
                    ))}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" className="btn-sm" onClick={() => setDupGroups(null)}>{tr.confirmCancel}</button>
                  <button type="button" className="btn-sm btn-sm-danger" onClick={() => { void handleMergeDuplicates() }} disabled={dupMerging}>
                    {dupMerging ? tr.dupMerging : tr.dupMergeButton}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Convert Format Panel */}
      {convertOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'grid', placeItems: 'center', zIndex: 1200 }}
          onClick={() => setConvertOpen(false)}
        >
          <div
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 24, minWidth: 400, maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>{tr.convertTitle}</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>{tr.convertTargetFormat}</label>
              <select
                value={convertFormat}
                onChange={(e) => setConvertFormat(e.target.value as 'webp' | 'jpeg')}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              >
                <option value="webp">WebP</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
                {tr.convertQuality}: {convertQuality}
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={convertQuality}
                onChange={(e) => setConvertQuality(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>{tr.convertScope}</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', marginBottom: 4 }}>
                <input type="radio" name="convertScope" checked={convertScope === 'all'} onChange={() => setConvertScope('all')} />
                {tr.convertScopeAll}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="radio" name="convertScope" checked={convertScope === 'selected'} onChange={() => setConvertScope('selected')} />
                {tr.convertScopeSelected} ({selectedIssueIds.size})
              </label>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--warning-bg, rgba(255,152,0,0.08))', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {tr.convertConfirmBody}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-sm" onClick={() => setConvertOpen(false)}>{tr.confirmCancel}</button>
              <button type="button" className="btn-sm btn-sm-primary" onClick={() => { void handleConvert() }} disabled={converting}>
                {converting ? tr.convertConverting : tr.convertExecute}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScanPage
