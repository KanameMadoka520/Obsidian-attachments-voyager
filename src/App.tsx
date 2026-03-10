import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import TitleBar from './components/TitleBar'
import { getTranslations } from './lib/i18n'
import type { Translations } from './lib/i18n'
import * as storage from './lib/storage'
import MigratePage from './pages/MigratePage'
import ScanPage from './pages/ScanPage'
import StatsPage from './pages/StatsPage'
import GalleryPage from './pages/GalleryPage'
import HelpPage from './pages/HelpPage'
import type { ConflictPolicy, Lang, ScanResult, ThemeMode } from './types'

export const LangContext = createContext<Translations>(getTranslations('zh'))
export const useLang = () => useContext(LangContext)

const SETTINGS_KEY = 'voyager-ui-settings-v1'

interface UiSettings {
  fontScale: number
  zoomScale: number
  conflictPolicy: ConflictPolicy
  theme: ThemeMode
  lang: Lang
}

const DEFAULT_SETTINGS: UiSettings = {
  fontScale: 1,
  zoomScale: 1,
  conflictPolicy: 'renameAll',
  theme: 'auto',
  lang: 'zh',
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
      lang: (['zh', 'en'] as const).includes(parsed.lang as Lang) ? parsed.lang as Lang : 'zh',
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
  const [activeTab, setActiveTab] = useState<'scan' | 'migrate' | 'stats' | 'gallery' | 'help'>('scan')
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null)
  const [lastVaultPath, setLastVaultPath] = useState('')
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS)

  const handleScanComplete = (result: ScanResult, vaultPath: string) => {
    setLastVaultPath(vaultPath)
    setLastScanResult((prev) => {
      if (!result.allImages && prev?.allImages) {
        return { ...result, allImages: prev.allImages }
      }
      return result
    })
  }

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
    <LangContext.Provider value={getTranslations(settings.lang)}>
      <div className="app-shell" style={rootStyle}>
        <TitleBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          theme={settings.theme}
          onThemeChange={(theme) => updateSettings({ theme })}
          lang={settings.lang}
          onLangChange={(lang) => updateSettings({ lang })}
        />
        <div className="app-body">
          {activeTab === 'scan' && (
            <ScanPage conflictPolicy={settings.conflictPolicy} onScanComplete={handleScanComplete} />
          )}
          {activeTab === 'migrate' && (
            <MigratePage conflictPolicy={settings.conflictPolicy} />
          )}
          {activeTab === 'stats' && (
            <StatsPage result={lastScanResult} />
          )}
          {activeTab === 'gallery' && (
            <GalleryPage result={lastScanResult} vaultPath={lastVaultPath} />
          )}
          {activeTab === 'help' && (
            <HelpPage />
          )}
        </div>
      </div>
    </LangContext.Provider>
  )
}

export default App
