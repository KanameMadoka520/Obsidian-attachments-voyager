import { useState, useRef, useEffect } from 'react'
import type { GalleryDisplayMode } from '../types'
import { useLang } from '../App'

interface ToolbarProps {
  vaultPath: string
  onVaultPathChange: (path: string) => void
  recentVaults: string[]
  onPickDirectory: () => void
  onScan: () => void
  scanning: boolean
  fixing: boolean
  displayMode: GalleryDisplayMode
  onDisplayModeChange: (mode: GalleryDisplayMode) => void
  hasResult: boolean
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onFix: () => void
  onExport?: (format: 'json' | 'csv' | 'markdown') => void
  generateThumbs: boolean
  onGenerateThumbsChange: (v: boolean) => void
}

function Toolbar({
  vaultPath, onVaultPathChange, recentVaults, onPickDirectory,
  onScan, scanning, fixing,
  displayMode, onDisplayModeChange,
  hasResult, selectedCount, totalCount,
  onSelectAll, onClearSelection, onFix, onExport,
  generateThumbs, onGenerateThumbsChange,
}: ToolbarProps) {
  const tr = useLang()
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  const displayModeLabels: Record<GalleryDisplayMode, string> = {
    thumbnail: tr.toolbarDisplayThumbnail,
    rawImage: tr.toolbarDisplayRawImage,
    noImage: tr.toolbarDisplayNoImage,
  }

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="toolbar-group toolbar-path">
          <input
            type="text"
            className="toolbar-input"
            list="recent-vaults-tb"
            value={vaultPath}
            onChange={(e) => onVaultPathChange(e.target.value)}
            placeholder={tr.toolbarVaultPlaceholder}
            aria-label={tr.toolbarVaultAriaLabel}
          />
          <datalist id="recent-vaults-tb">
            {recentVaults.map((p) => <option key={p} value={p} />)}
          </datalist>
          <button type="button" className="btn-sm" onClick={onPickDirectory}>{tr.toolbarPick}</button>
          <button type="button" className="btn-sm btn-sm-primary" onClick={onScan} disabled={scanning || fixing}>
            {scanning ? tr.toolbarScanning : tr.toolbarScan}
          </button>
        </div>

        <div className="toolbar-sep" />

        <label className="toolbar-check">
          <input type="checkbox" checked={generateThumbs} onChange={(e) => onGenerateThumbsChange(e.target.checked)} disabled={scanning || fixing} />
          <span>{tr.toolbarThumbnail}</span>
          <span className="toolbar-hint-wrap">
            <span className="toolbar-hint">?</span>
            <span className="toolbar-tooltip">{tr.toolbarThumbnailTooltip}</span>
          </span>
        </label>

        {hasResult && (
          <>
            <div className="toolbar-sep" />
            <div className="toolbar-group">
              {(['thumbnail', 'rawImage', 'noImage'] as const).map((m) => (
                <span key={m} className={m === 'rawImage' ? 'toolbar-hint-wrap' : undefined}>
                  <button
                    type="button"
                    className={`toolbar-mode ${displayMode === m ? 'active' : ''}`}
                    onClick={() => onDisplayModeChange(m)}
                  >
                    {displayModeLabels[m]}
                  </button>
                  {m === 'rawImage' && (
                    <span className="toolbar-tooltip">{tr.toolbarRawImageTooltip}</span>
                  )}
                </span>
              ))}
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
              <button type="button" className="btn-sm" onClick={onSelectAll}>{tr.toolbarSelectAll}</button>
              <button type="button" className="btn-sm" onClick={onClearSelection}>{tr.toolbarClearSelection}</button>
              <span className="toolbar-hint-wrap">
                <button type="button" className="btn-sm btn-sm-danger" onClick={onFix} disabled={fixing}>
                  {selectedCount > 0 ? tr.toolbarFixWithCount.replace('{count}', String(selectedCount)) : tr.toolbarFix}
                </button>
                <span className="toolbar-tooltip toolbar-tooltip-wide">{tr.toolbarFixTooltip}</span>
              </span>
            </div>

            {onExport && (
              <>
                <div className="toolbar-sep" />
                <div className="export-dropdown-wrap" ref={exportRef}>
                  <button type="button" className="btn-sm" onClick={() => setExportOpen(!exportOpen)}>
                    {tr.toolbarExport}
                  </button>
                  {exportOpen && (
                    <div className="export-dropdown">
                      <button type="button" className="export-dropdown-item" onClick={() => { onExport('json'); setExportOpen(false) }}>JSON</button>
                      <button type="button" className="export-dropdown-item" onClick={() => { onExport('csv'); setExportOpen(false) }}>CSV</button>
                      <button type="button" className="export-dropdown-item" onClick={() => { onExport('markdown'); setExportOpen(false) }}>Markdown</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Toolbar
