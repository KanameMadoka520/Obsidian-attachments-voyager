import { useEffect, useMemo, useState } from 'react'
import TitleBar from './components/TitleBar'
import MigratePage from './pages/MigratePage'
import ScanPage from './pages/ScanPage'
import type { ConflictPolicy } from './types'

const SETTINGS_KEY = 'voyager-ui-settings-v1'

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

  const rootStyle = useMemo(() => ({
    '--app-font-scale': settings.fontScale,
    '--app-zoom-scale': settings.zoomScale,
  } as React.CSSProperties), [settings.fontScale, settings.zoomScale])

  return (
    <div className="app-shell" style={rootStyle}>
      <TitleBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="app-body">
        {activeTab === 'scan' ? (
          <ScanPage conflictPolicy={settings.conflictPolicy} />
        ) : (
          <MigratePage conflictPolicy={settings.conflictPolicy} />
        )}
      </div>
    </div>
  )
}

export default App
