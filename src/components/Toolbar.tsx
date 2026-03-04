import { useState, useRef, useEffect } from 'react'
import type { GalleryDisplayMode } from '../types'

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
            placeholder="仓库路径..."
            aria-label="仓库路径"
          />
          <datalist id="recent-vaults-tb">
            {recentVaults.map((p) => <option key={p} value={p} />)}
          </datalist>
          <button type="button" className="btn-sm" onClick={onPickDirectory}>选择</button>
          <button type="button" className="btn-sm btn-sm-primary" onClick={onScan} disabled={scanning || fixing}>
            {scanning ? '扫描中...' : '扫描'}
          </button>
        </div>

        <div className="toolbar-sep" />

        <label className="toolbar-check">
          <input type="checkbox" checked={generateThumbs} onChange={(e) => onGenerateThumbsChange(e.target.checked)} disabled={scanning || fixing} />
          <span>缩略图</span>
          <span className="toolbar-hint-wrap">
            <span className="toolbar-hint">?</span>
            <span className="toolbar-tooltip">勾选后扫描时会生成三级缩略图缓存（64px / 256px / 1024px），用于画廊展示和预览弹窗。生成缩略图会降低扫描速度，但后续浏览性能更好。取消勾选则跳过生成，画廊使用原图或不显示图片。</span>
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
                    {{ thumbnail: '缩略', rawImage: '原图', noImage: '无图' }[m]}
                  </button>
                  {m === 'rawImage' && (
                    <span className="toolbar-tooltip">原图模式直接加载完整图片文件，虽然使用了懒加载（lazy loading）优化，但当图片数量较多或单张体积较大时，仍可能导致内存占用过高、界面卡顿等性能问题。建议优先使用缩略图模式浏览。</span>
                  )}
                </span>
              ))}
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
              <button type="button" className="btn-sm" onClick={onSelectAll}>全选</button>
              <button type="button" className="btn-sm" onClick={onClearSelection}>清空</button>
              <span className="toolbar-hint-wrap">
                <button type="button" className="btn-sm btn-sm-danger" onClick={onFix} disabled={fixing}>
                  修复{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </button>
                <span className="toolbar-tooltip toolbar-tooltip-wide">对选中的问题执行修复：Orphan（孤立附件）将被删除；Misplaced（错位附件）将被移动到正确的附件目录，同时自动更新 Markdown 中的引用链接。所有操作均可在操作历史中撤回。</span>
              </span>
            </div>

            {onExport && (
              <>
                <div className="toolbar-sep" />
                <div className="export-dropdown-wrap" ref={exportRef}>
                  <button type="button" className="btn-sm" onClick={() => setExportOpen(!exportOpen)}>
                    导出 ▾
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
