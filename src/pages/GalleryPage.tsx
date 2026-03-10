import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { useLang } from '../App'
import ConfirmDialog from '../components/ConfirmDialog'
import ProgressBar from '../components/ProgressBar'
import VirtualGallery from '../components/VirtualGallery'
import StatsCards from '../components/StatsCards'
import { FILE_TYPE_GROUPS } from '../components/Sidebar'
import { filterIssues, type FilterParams } from '../lib/filterUtils'
import { openVaultFile, openVaultFileParent } from '../lib/commands'
import type { AuditIssue, AttachmentInfo, GalleryDisplayMode, ScanResult, SizeFilter } from '../types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042']
const WORKER_THRESHOLD = 5000

function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function getExtension(filePath: string): string {
  let ext = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'jpeg') ext = 'jpg'
  return ext
}

function toDisplayItem(att: AttachmentInfo, index: number): AuditIssue {
  return {
    id: `att-${index}`,
    type: 'orphan',
    imagePath: att.path,
    reason: '',
    fileSize: att.fileSize,
    fileMtime: att.fileMtime,
  }
}

interface GalleryPageProps {
  result: ScanResult | null
  vaultPath: string
}

export default function GalleryPage({ result, vaultPath }: GalleryPageProps) {
  const tr = useLang()

  // --- All hooks BEFORE any early return ---
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fileTypeFilter, setFileTypeFilter] = useState<Set<string>>(() => new Set(FILE_TYPE_GROUPS.map((g) => g.key)))
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all')
  const [displayMode, setDisplayMode] = useState<GalleryDisplayMode>('thumbnail')
  const [filtered, setFiltered] = useState<AuditIssue[]>([])
  const workerRef = useRef<Worker | null>(null)
  const [generating, setGenerating] = useState(false)
  const [thumbProgress, setThumbProgress] = useState<{ phase: string; current: number; total: number } | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [scanVersion, setScanVersion] = useState(0)
  const [galleryThumbMap, setGalleryThumbMap] = useState<Record<string, { tiny?: string; small?: string; medium?: string }>>({})

  const allImages = result?.allImages
  const displayItems = useMemo(() => allImages?.map(toDisplayItem) ?? [], [allImages])

  const extGroupMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of FILE_TYPE_GROUPS) {
      for (const ext of g.extensions) map[ext] = g.key
    }
    return map
  }, [])

  // Debounce search (300ms, same as ScanPage)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchText])

  // Filter: sync for small sets, Web Worker for large sets
  const fileTypeArray = useMemo(() => Array.from(fileTypeFilter), [fileTypeFilter])

  useEffect(() => {
    const params: FilterParams = {
      issues: displayItems,
      search: debouncedSearch,
      fileTypeFilter: fileTypeArray,
      totalTypeGroups: FILE_TYPE_GROUPS.length,
      sizeFilter,
      extGroupMap,
    }

    if (displayItems.length < WORKER_THRESHOLD) {
      setFiltered(filterIssues(params))
      return
    }

    // Large dataset: use Web Worker
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/filterWorker.ts', import.meta.url),
        { type: 'module' },
      )
    }
    const w = workerRef.current
    w.onmessage = (e: MessageEvent<AuditIssue[]>) => setFiltered(e.data)
    w.postMessage(params)
  }, [displayItems, debouncedSearch, fileTypeArray, sizeFilter, extGroupMap])

  // Cleanup worker on unmount
  useEffect(() => () => { workerRef.current?.terminate() }, [])

  const issueIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((item, index) => map.set(item.id, index))
    return map
  }, [filtered])

  const totalSize = useMemo(
    () => allImages?.reduce((sum, img) => sum + img.fileSize, 0) ?? 0,
    [allImages],
  )

  // Mini chart data
  const formatData = useMemo(() => {
    if (!allImages) return []
    const extMap: Record<string, number> = {}
    const knownExts = ['png', 'jpg', 'gif', 'svg', 'webp', 'bmp']
    allImages.forEach((img) => {
      let ext = getExtension(img.path)
      if (!knownExts.includes(ext)) ext = 'other'
      extMap[ext] = (extMap[ext] || 0) + 1
    })
    return Object.entries(extMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [allImages])

  const sizeDistData = useMemo(() => {
    if (!allImages) return []
    const buckets = [
      { name: '< 100KB', count: 0 },
      { name: '100KB\u20131MB', count: 0 },
      { name: '1\u20135MB', count: 0 },
      { name: '> 5MB', count: 0 },
    ]
    allImages.forEach((img) => {
      if (img.fileSize < 102400) buckets[0].count++
      else if (img.fileSize <= 1048576) buckets[1].count++
      else if (img.fileSize <= 5242880) buckets[2].count++
      else buckets[3].count++
    })
    return buckets
  }, [allImages])

  const bustKey = String(scanVersion)
  const fileSrc = useCallback((path: string) => {
    try {
      const src = convertFileSrc(path)
      return bustKey ? `${src}?v=${bustKey}` : src
    } catch {
      return path
    }
  }, [bustKey])

  const getThumbSrc = useCallback(
    (issue: AuditIssue, size: 'tiny' | 'small' | 'medium'): string => {
      const path = galleryThumbMap[issue.imagePath]?.[size]
      return path ? fileSrc(path) : ''
    },
    [fileSrc, galleryThumbMap],
  )

  useEffect(() => {
    if (displayMode !== 'thumbnail' || !allImages || allImages.length === 0) {
      if (!allImages || allImages.length === 0) setGalleryThumbMap({})
      return
    }
    let cancelled = false
    void invoke<Record<string, { tiny?: string; small?: string; medium?: string }>>('get_all_thumbnail_paths', {
      paths: allImages.map((img) => img.path),
    }).then((map) => {
      if (!cancelled) setGalleryThumbMap(map)
    }).catch(() => {
      if (!cancelled) setGalleryThumbMap({})
    })
    return () => {
      cancelled = true
    }
  }, [allImages, displayMode, scanVersion])

  const [previewIssue, setPreviewIssue] = useState<AuditIssue | null>(null)
  const [previewZoom, setPreviewZoom] = useState<number | null>(null)
  const [previewNaturalSize, setPreviewNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const wheelZoomRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    dragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0,
  })
  const [fullscreenIssue, setFullscreenIssue] = useState<AuditIssue | null>(null)
  const [fsZoom, setFsZoom] = useState<number | null>(null)
  const [fsNatural, setFsNatural] = useState<{ w: number; h: number } | null>(null)
  const fsScrollRef = useRef<HTMLDivElement>(null)
  const fsWheelRef = useRef<HTMLDivElement>(null)
  const fsDragState = useRef<{ dragging: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    dragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0,
  })

  const handleOpenFile = useCallback(async (path: string) => {
    if (!vaultPath.trim() || !result?.allImages?.some((img) => img.path === path)) return
    try { await openVaultFile(path, vaultPath) } catch { /* ignore */ }
  }, [result, vaultPath])

  const handleOpenFolder = useCallback(async (path: string) => {
    if (!vaultPath.trim() || !result?.allImages?.some((img) => img.path === path)) return
    try { await openVaultFileParent(path, vaultPath) } catch { /* ignore */ }
  }, [result, vaultPath])

  const handlePreviewClick = useCallback((issue: AuditIssue) => {
    setPreviewIssue(issue)
    setPreviewZoom(null)
    setPreviewNaturalSize(null)
  }, [])

  const closePreview = useCallback(() => {
    setPreviewIssue(null)
    setPreviewZoom(null)
    setPreviewNaturalSize(null)
  }, [])

  const enterFullscreen = useCallback((issue: AuditIssue) => {
    setFullscreenIssue(issue)
    setFsZoom(null)
    setFsNatural(null)
  }, [])

  const exitFullscreen = useCallback(() => {
    setFullscreenIssue(null)
    setFsZoom(null)
    setFsNatural(null)
  }, [])

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

  // --- Early return AFTER all hooks ---
  if (!result || !allImages || allImages.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        {tr.galleryNoData}
      </div>
    )
  }

  const toggleType = (key: string) => {
    setFileTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const textColor = getCSSVar('--text-main') || '#888'

  return (
    <div className="scan-layout">
      <div style={{ padding: '8px 12px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        <p style={{ margin: '0 0 6px' }}>{tr.galleryOverviewGuide}</p>
        <p style={{ margin: 0 }}>{tr.galleryControlsGuide}</p>
      </div>
      {/* Stats header */}
      <div className="gallery-header">
        <StatsCards
          totalImages={allImages.length}
          totalSize={totalSize}
          filteredCount={filtered.length}
        />
        <div className="gallery-header-actions">
          <button
            type="button"
            className="btn-sm"
            disabled={generating}
            title={tr.galleryGenerateThumbsDesc}
            onClick={async () => {
              if (!allImages || generating) return
              setGenerating(true)
              setThumbProgress(null)
              const unlisten = await listen<{ phase: string; current: number; total: number }>('scan-progress', (e) => {
                setThumbProgress(e.payload)
              })
              try {
                await invoke('generate_all_thumbnails_all', { paths: allImages.map((img) => img.path) })
                setScanVersion((v) => v + 1)
              } finally {
                if (typeof unlisten === 'function') {
                  unlisten()
                }
                setGenerating(false)
                setThumbProgress(null)
              }
            }}
          >
            {generating ? tr.galleryGenerating : tr.galleryGenerateThumbs}
          </button>
          <button
            type="button"
            className="btn-sm"
            disabled={generating}
            title={tr.galleryClearCacheDesc}
            onClick={() => setClearConfirmOpen(true)}
          >
            {tr.galleryClearCache}
          </button>
          <span className="gallery-header-separator" />
          {(['thumbnail', 'rawImage', 'noImage'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`toolbar-mode ${displayMode === mode ? 'active' : ''}`}
              onClick={() => setDisplayMode(mode)}
            >
              {mode === 'thumbnail'
                ? tr.toolbarDisplayThumbnail
                : mode === 'rawImage'
                  ? tr.toolbarDisplayRawImage
                  : tr.toolbarDisplayNoImage}
            </button>
          ))}
        </div>
      </div>

      {generating && (
        <ProgressBar
          progress={thumbProgress ? { phase: thumbProgress.phase as 'thumbnails', current: thumbProgress.current, total: thumbProgress.total } : null}
          visible
        />
      )}

      <ConfirmDialog
        open={clearConfirmOpen}
        title={tr.galleryClearCache}
        body={tr.galleryClearCacheDesc}
        confirmLabel={tr.confirmOk}
        cancelLabel={tr.confirmCancel}
        onConfirm={async () => {
          setClearConfirmOpen(false)
          await invoke('clear_thumbnail_cache_all')
          setGalleryThumbMap({})
          setScanVersion((v) => v + 1)
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <div className="scan-panels">
        {/* Sidebar filters */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-heading">{tr.sidebarSearch}</div>
            <input
              type="text"
              className="sidebar-search"
              placeholder={tr.sidebarSearchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="sidebar-section">
            <div className="sidebar-heading">{tr.sidebarFileType}</div>
            <div className="sidebar-filter-group">
              {FILE_TYPE_GROUPS.map((g) => (
                <label key={g.key} className="sidebar-filter-item">
                  <input type="checkbox" checked={fileTypeFilter.has(g.key)} onChange={() => toggleType(g.key)} />
                  <span className="sidebar-filter-label">{g.labelKey ? tr[g.labelKey as keyof typeof tr] : g.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-heading">{tr.sidebarFileSize}</div>
            <div className="sidebar-filter-group">
              {([
                { value: 'all' as SizeFilter, label: tr.sidebarSizeAll },
                { value: 'small' as SizeFilter, label: '< 100 KB' },
                { value: 'medium' as SizeFilter, label: '100 KB \u2013 1 MB' },
                { value: 'large' as SizeFilter, label: '> 1 MB' },
              ]).map((opt) => (
                <label key={opt.value} className="sidebar-filter-item">
                  <input
                    type="radio"
                    name="gallerySizeFilter"
                    checked={sizeFilter === opt.value}
                    onChange={() => setSizeFilter(opt.value)}
                  />
                  <span className="sidebar-filter-label">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Mini charts */}
          <div className="sidebar-section">
            <div className="sidebar-heading">{tr.galleryFormatBreakdown}</div>
            <div style={{ width: '100%', height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={55}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {formatData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-heading">{tr.gallerySizeBreakdown}</div>
            <div style={{ width: '100%', height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeDistData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: textColor }} />
                  <YAxis tick={{ fontSize: 9, fill: textColor }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </aside>

        <main className="scan-gallery">
          <VirtualGallery
            issues={filtered}
            displayMode={displayMode}
            selectedIssueIds={new Set()}
            issueIndexMap={issueIndexMap}
            toFilePreviewSrc={fileSrc}
            getThumbSrc={getThumbSrc}
            onIssueClick={(_id: string, _idx: number) => {
              const issue = filtered.find((i) => i.id === _id)
              if (issue) handlePreviewClick(issue)
            }}
            onPreviewClick={handlePreviewClick}
            readOnly
            fillHeight
          />
        </main>
      </div>

      {/* Preview overlay */}
      {previewIssue && (() => {
        const currentIdx = filtered.findIndex((i) => i.id === previewIssue.id)
        const hasPrev = currentIdx > 0
        const hasNext = currentIdx < filtered.length - 1
        const goPrev = () => { if (hasPrev) { setPreviewIssue(filtered[currentIdx - 1]); setPreviewZoom(null); setPreviewNaturalSize(null) } }
        const goNext = () => { if (hasNext) { setPreviewIssue(filtered[currentIdx + 1]); setPreviewZoom(null); setPreviewNaturalSize(null) } }

        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
            onClick={closePreview}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') goPrev()
              else if (e.key === 'ArrowRight') goNext()
              else if (e.key === 'Escape') closePreview()
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
              style={{ background: 'var(--panel-bg, #fff)', borderRadius: 12, padding: 24, minWidth: 320, maxWidth: '90vw', boxShadow: '0 8px 32px var(--shadow)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: 8, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentIdx + 1} / {filtered.length}
                {previewZoom !== null && previewNaturalSize
                  ? ` · ${Math.round(previewZoom * 100)}%`
                  : ` · ${tr.scanPreviewFit}`}
                {` · ${tr.scanPreviewHint}`}
              </div>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <div
                  ref={(el) => {
                    previewScrollRef.current = el
                    wheelZoomRef.current = el
                  }}
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: 400,
                    borderRadius: 8,
                    overflow: previewZoom !== null ? 'auto' : 'hidden',
                    background: 'var(--placeholder-bg)',
                    marginBottom: 12,
                    cursor: dragState.current.dragging ? 'grabbing' : previewZoom !== null ? 'grab' : 'zoom-in',
                  }}
                  onMouseDown={(e) => {
                    if (previewZoom === null || e.button !== 0 || !previewScrollRef.current) return
                    dragState.current = {
                      dragging: true,
                      startX: e.clientX,
                      startY: e.clientY,
                      scrollLeft: previewScrollRef.current.scrollLeft,
                      scrollTop: previewScrollRef.current.scrollTop,
                    }
                    e.preventDefault()
                  }}
                  onMouseMove={(e) => {
                    const ds = dragState.current
                    if (!ds.dragging || !previewScrollRef.current) return
                    previewScrollRef.current.scrollLeft = ds.scrollLeft - (e.clientX - ds.startX)
                    previewScrollRef.current.scrollTop = ds.scrollTop - (e.clientY - ds.startY)
                  }}
                  onMouseUp={() => { dragState.current.dragging = false }}
                  onMouseLeave={() => { dragState.current.dragging = false }}
                >
                  {(() => {
                    const imgSrc = displayMode === 'thumbnail' && (previewIssue.thumbnailPaths || previewIssue.thumbnailPath)
                      ? (getThumbSrc(previewIssue, 'medium') || getThumbSrc(previewIssue, 'small') || fileSrc(previewIssue.imagePath))
                      : fileSrc(previewIssue.imagePath)
                    const isFit = previewZoom === null
                    const imgStyle: React.CSSProperties = isFit
                      ? { maxWidth: '100%', maxHeight: 400, objectFit: 'contain' as const, display: 'block', margin: '0 auto', borderRadius: 8 }
                      : {
                          width: previewNaturalSize ? previewNaturalSize.w * previewZoom : undefined,
                          height: previewNaturalSize ? previewNaturalSize.h * previewZoom : undefined,
                          display: 'block',
                          margin: '0 auto',
                          borderRadius: 8,
                        }

                    return (
                      <img
                        src={imgSrc}
                        alt={previewIssue.imagePath}
                        draggable={false}
                        style={imgStyle}
                        onClick={(e) => {
                          const ds = dragState.current
                          const dx = Math.abs(e.clientX - ds.startX)
                          const dy = Math.abs(e.clientY - ds.startY)
                          if (dx < 5 && dy < 5) {
                            setPreviewZoom((prev) => (prev === null ? 1 : null))
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
                  {previewIssue.imagePath}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={() => { void handleOpenFile(previewIssue.imagePath); closePreview() }}>
                  {tr.scanPreviewOpenFile}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { void handleOpenFolder(previewIssue.imagePath); closePreview() }}>
                  {tr.scanPreviewOpenFolder}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => enterFullscreen(previewIssue)}>
                  {tr.scanPreviewFullscreenRaw}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewZoom(null)}>
                  {tr.scanPreviewResetZoom}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewZoom(1)} disabled={!previewNaturalSize}>
                  {tr.scanPreviewOriginalSize}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closePreview}>
                  {tr.scanPreviewCancel}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {fullscreenIssue && (() => {
        const currentIdx = filtered.findIndex((i) => i.id === fullscreenIssue.id)
        const fsPrev = currentIdx > 0 ? filtered[currentIdx - 1] : null
        const fsNext = currentIdx < filtered.length - 1 ? filtered[currentIdx + 1] : null
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(0,0,0,0.6)', flexShrink: 0, zIndex: 1 }}>
              <div style={{ color: '#fff', fontSize: '0.85rem', opacity: 0.8 }}>
                {currentIdx >= 0 ? `${currentIdx + 1} / ${filtered.length}` : ''}
                {fsZoom !== null && fsNatural ? ` · ${Math.round(fsZoom * 100)}%` : ` · ${tr.scanFsAdaptive}`}
                <span style={{ marginLeft: 12, opacity: 0.6 }}>{tr.scanFsHint}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setFsZoom(null)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {tr.scanFsAdaptive}
                </button>
                <button type="button" onClick={() => setFsZoom(1)} disabled={!fsNatural} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  100%
                </button>
                <button type="button" onClick={exitFullscreen} style={{ background: 'rgba(255,80,80,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  {tr.scanFsExitFullscreen}
                </button>
              </div>
            </div>

            <div
              ref={(el) => {
                fsScrollRef.current = el
                fsWheelRef.current = el
              }}
              style={{ flex: 1, overflow: isFit ? 'hidden' : 'auto', display: isFit ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center', cursor: isFit ? 'zoom-in' : 'grab' }}
              onMouseDown={(e) => {
                if (e.button !== 0 || isFit || !fsScrollRef.current) return
                fsDragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, scrollLeft: fsScrollRef.current.scrollLeft, scrollTop: fsScrollRef.current.scrollTop }
                e.preventDefault()
              }}
              onMouseMove={(e) => {
                const ds = fsDragState.current
                if (!ds.dragging || !fsScrollRef.current) return
                fsScrollRef.current.scrollLeft = ds.scrollLeft - (e.clientX - ds.startX)
                fsScrollRef.current.scrollTop = ds.scrollTop - (e.clientY - ds.startY)
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

            {fsPrev && (
              <button type="button" onClick={() => { setFullscreenIssue(fsPrev); setFsZoom(null); setFsNatural(null) }} style={{ position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: 24, cursor: 'pointer', zIndex: 10001, display: 'grid', placeItems: 'center' }} aria-label={tr.scanPrevImage}>‹</button>
            )}
            {fsNext && (
              <button type="button" onClick={() => { setFullscreenIssue(fsNext); setFsZoom(null); setFsNatural(null) }} style={{ position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: 24, cursor: 'pointer', zIndex: 10001, display: 'grid', placeItems: 'center' }} aria-label={tr.scanNextImage}>›</button>
            )}
          </div>
        )
      })()}
    </div>
  )
}
