import { appWindow } from '@tauri-apps/api/window'
import { useState, useEffect } from 'react'
import { useLang } from '../App'
import type { Lang, ThemeMode } from '../types'

interface TitleBarProps {
  activeTab: 'scan' | 'migrate' | 'stats'
  onTabChange: (tab: 'scan' | 'migrate' | 'stats') => void
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  lang: Lang
  onLangChange: (lang: Lang) => void
}

function TitleBar({ activeTab, onTabChange, theme, onThemeChange, lang, onLangChange }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false)
  const tr = useLang()

  const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: 'auto', label: tr.themeAuto },
    { value: 'light', label: tr.themeLight },
    { value: 'dark', label: tr.themeDark },
    { value: 'parchment', label: tr.themeParchment },
  ]

  useEffect(() => {
    const check = () => {
      appWindow.isMaximized().then(setMaximized).catch(() => {})
    }
    check()
    const unlisten = appWindow.onResized(() => { check() })
    return () => { unlisten.then((fn) => fn()) }
  }, [])

  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar-left">
        <span className="title-bar-brand">Voyager</span>
        <nav className="title-bar-nav">
          <button
            type="button"
            className={`title-bar-tab ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => onTabChange('scan')}
          >
            {tr.tabScan}
          </button>
          <button
            type="button"
            className={`title-bar-tab ${activeTab === 'migrate' ? 'active' : ''}`}
            onClick={() => onTabChange('migrate')}
          >
            {tr.tabMigrate}
          </button>
          <button
            type="button"
            className={`title-bar-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => onTabChange('stats')}
          >
            {tr.tabStats}
          </button>
        </nav>
      </div>
      <div className="title-bar-right">
        <button
          type="button"
          className="title-bar-lang-btn"
          onClick={() => onLangChange(lang === 'zh' ? 'en' : 'zh')}
        >
          {tr.langToggle}
        </button>
        <select
          className="title-bar-theme"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
          aria-label={tr.themeAriaLabel}
        >
          {THEME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="title-bar-controls">
          <button type="button" className="title-bar-btn" onClick={() => appWindow.minimize()} aria-label={tr.minimize}>─</button>
          <button type="button" className="title-bar-btn" onClick={() => appWindow.toggleMaximize()} aria-label={maximized ? tr.restore : tr.maximize}>{maximized ? '⧉' : '□'}</button>
          <button type="button" className="title-bar-btn title-bar-close" onClick={() => appWindow.close()} aria-label={tr.close}>✕</button>
        </div>
      </div>
    </div>
  )
}

export default TitleBar
