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
  onExport?: () => void
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

        <label
          className="toolbar-check"
          title="勾选后扫描时会生成三级缩略图缓存（64px / 256px / 1024px），用于画廊展示和预览弹窗。生成缩略图会降低扫描速度，但后续浏览性能更好。取消勾选则跳过生成，画廊使用原图或不显示图片。"
        >
          <input type="checkbox" checked={generateThumbs} onChange={(e) => onGenerateThumbsChange(e.target.checked)} disabled={scanning || fixing} />
          <span>缩略图</span>
          <span className="toolbar-hint">?</span>
        </label>

        {hasResult && (
          <>
            <div className="toolbar-sep" />
            <div className="toolbar-group">
              {(['thumbnail', 'rawImage', 'noImage'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`toolbar-mode ${displayMode === m ? 'active' : ''}`}
                  onClick={() => onDisplayModeChange(m)}
                >
                  {{ thumbnail: '缩略', rawImage: '原图', noImage: '无图' }[m]}
                </button>
              ))}
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
              <button type="button" className="btn-sm" onClick={onSelectAll}>全选</button>
              <button type="button" className="btn-sm" onClick={onClearSelection}>清空</button>
              <button type="button" className="btn-sm btn-sm-danger" onClick={onFix} disabled={fixing}>
                修复{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
            </div>

            {onExport && (
              <>
                <div className="toolbar-sep" />
                <button type="button" className="btn-sm" onClick={onExport}>导出</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Toolbar
