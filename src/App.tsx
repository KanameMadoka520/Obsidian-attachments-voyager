import { useEffect, useMemo, useState } from 'react'
import TitleBar from './components/TitleBar'
import * as storage from './lib/storage'
import MigratePage from './pages/MigratePage'
import ScanPage from './pages/ScanPage'
import StatsPage from './pages/StatsPage'
import type { ConflictPolicy, ScanResult, ThemeMode } from './types'

const SETTINGS_KEY = 'voyager-ui-settings-v1'

interface UiSettings {
  fontScale: number
  zoomScale: number
  conflictPolicy: ConflictPolicy
  theme: ThemeMode
}

const DEFAULT_SETTINGS: UiSettings = {
  fontScale: 1,
  zoomScale: 1,
  conflictPolicy: 'renameAll',
  theme: 'auto',
}

function loadSettings(): UiSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<UiSettings>
    return {
      fontScale: typeof parsed.fontScale === 'number' ? parsed.fontScale : 1,
      zoomScale: typeof parsed.zoomScale === 'number' ? parsed.zoomScale : 1,
      conflictPolicy: parsed.conflictPolicy ?? 'renameAll',
      theme: (['auto', 'light', 'dark', 'parchment'] as const).includes(parsed.theme as ThemeMode) ? parsed.theme as ThemeMode : 'auto',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

function App() {
  const [ready, setReady] = useState(false)
  const [activeTab, setActiveTab] = useState<'scan' | 'migrate' | 'stats'>('scan')
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null)
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    storage.initStorage().then(() => {
      setSettings(loadSettings())
      setReady(true)
    }).catch(() => {
      setReady(true)
    })
  }, [])

  const updateSettings = (patch: Partial<UiSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      storage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }

  // Apply theme and listen for system changes in auto mode
  useEffect(() => {
    applyTheme(settings.theme)

    if (settings.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('auto')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [settings.theme])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--app-font-scale', `${settings.fontScale}`)
    root.style.setProperty('--app-zoom-scale', `${settings.zoomScale}`)
  }, [settings.fontScale, settings.zoomScale])

  const rootStyle = useMemo(() => ({
    '--app-font-scale': settings.fontScale,
    '--app-zoom-scale': settings.zoomScale,
  } as React.CSSProperties), [settings.fontScale, settings.zoomScale])

  if (!ready) return null

  return (
    <div className="app-shell" style={rootStyle}>
      <TitleBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={settings.theme}
        onThemeChange={(theme) => updateSettings({ theme })}
      />
      <div className="app-body">
        {activeTab === 'scan' && (
          <ScanPage conflictPolicy={settings.conflictPolicy} onScanComplete={setLastScanResult} />
        )}
        {activeTab === 'migrate' && (
          <MigratePage conflictPolicy={settings.conflictPolicy} />
        )}
        {activeTab === 'stats' && (
          <StatsPage result={lastScanResult} />
        )}
      </div>
    </div>
  )
}

export default App
