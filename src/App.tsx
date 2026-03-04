import { useEffect, useMemo, useState } from 'react'
import MigratePage from './pages/MigratePage'
import ScanPage from './pages/ScanPage'

const SETTINGS_KEY = 'voyager-ui-settings-v1'

type ConflictPolicy = 'promptEach' | 'overwriteAll' | 'renameAll'

interface UiSettings {
  fontScale: number
  zoomScale: number
  conflictPolicy: ConflictPolicy
}

const DEFAULT_SETTINGS: UiSettings = {
  fontScale: 1,
  zoomScale: 1,
  conflictPolicy: 'renameAll',
}

function loadSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<UiSettings>
    return {
      fontScale: typeof parsed.fontScale === 'number' ? parsed.fontScale : 1,
      zoomScale: typeof parsed.zoomScale === 'number' ? parsed.zoomScale : 1,
      conflictPolicy: parsed.conflictPolicy ?? 'renameAll',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'migrate'>('scan')
  const [settings, setSettings] = useState<UiSettings>(() => loadSettings())

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    const root = document.documentElement
    root.style.setProperty('--app-font-scale', `${settings.fontScale}`)
    root.style.setProperty('--app-zoom-scale', `${settings.zoomScale}`)
  }, [settings])

  const settingsBar = useMemo(() => {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="input-group" style={{ marginBottom: 8 }}>
          <label className="input-label" htmlFor="font-scale">字体比例</label>
          <input
            id="font-scale"
            className="input-field"
            type="range"
            min={0.85}
            max={1.3}
            step={0.05}
            value={settings.fontScale}
            onChange={(e) => setSettings((prev) => ({ ...prev, fontScale: Number(e.target.value) }))}
          />
          <span>{settings.fontScale.toFixed(2)}x</span>
        </div>

        <div className="input-group" style={{ marginBottom: 8 }}>
          <label className="input-label" htmlFor="zoom-scale">缩放比例</label>
          <input
            id="zoom-scale"
            className="input-field"
            type="range"
            min={0.85}
            max={1.25}
            step={0.05}
            value={settings.zoomScale}
            onChange={(e) => setSettings((prev) => ({ ...prev, zoomScale: Number(e.target.value) }))}
          />
          <span>{settings.zoomScale.toFixed(2)}x</span>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" htmlFor="conflict-policy">冲突策略</label>
          <select
            id="conflict-policy"
            className="input-field"
            value={settings.conflictPolicy}
            onChange={(e) => setSettings((prev) => ({ ...prev, conflictPolicy: e.target.value as ConflictPolicy }))}
          >
            <option value="promptEach">每次冲突都弹窗选择</option>
            <option value="overwriteAll">之后所有冲突都覆盖</option>
            <option value="renameAll">之后所有冲突都改名共存</option>
          </select>

          <button type="button" className="btn btn-secondary" onClick={() => setSettings(DEFAULT_SETTINGS)}>
            恢复默认
          </button>
        </div>
      </div>
    )
  }, [settings])

  return (
    <div className="app-container" style={{ fontSize: `calc(16px * var(--app-font-scale, 1))`, zoom: 'var(--app-zoom-scale, 1)' }}>
      <header className="app-header">
        <div className="app-title">Obsidian Attachments Voyager</div>
        <nav className="nav-tabs">
          <button className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
            附件扫描
          </button>
          <button className={`tab-btn ${activeTab === 'migrate' ? 'active' : ''}`} onClick={() => setActiveTab('migrate')}>
            联动迁移
          </button>
        </nav>
      </header>

      <main className="main-content">
        {settingsBar}
        {activeTab === 'scan' ? <ScanPage conflictPolicy={settings.conflictPolicy} /> : <MigratePage conflictPolicy={settings.conflictPolicy} />}
      </main>

      <footer className="app-footer">GitHub: KanameMadoka520</footer>
    </div>
  )
}

export default App
