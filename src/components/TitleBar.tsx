import { appWindow } from '@tauri-apps/api/window'
import { useState, useEffect } from 'react'
import type { ThemeMode } from '../types'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: '跟随系统' },
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'parchment', label: '羊皮纸' },
]

interface TitleBarProps {
  activeTab: 'scan' | 'migrate' | 'stats'
  onTabChange: (tab: 'scan' | 'migrate' | 'stats') => void
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
}

function TitleBar({ activeTab, onTabChange, theme, onThemeChange }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false)

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
            附件扫描
          </button>
          <button
            type="button"
            className={`title-bar-tab ${activeTab === 'migrate' ? 'active' : ''}`}
            onClick={() => onTabChange('migrate')}
          >
            联动迁移
          </button>
          <button
            type="button"
            className={`title-bar-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => onTabChange('stats')}
          >
            统计
          </button>
        </nav>
      </div>
      <div className="title-bar-right">
        <select
          className="title-bar-theme"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
          aria-label="主题"
        >
          {THEME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="title-bar-controls">
          <button type="button" className="title-bar-btn" onClick={() => appWindow.minimize()} aria-label="最小化">─</button>
          <button type="button" className="title-bar-btn" onClick={() => appWindow.toggleMaximize()} aria-label={maximized ? '还原' : '最大化'}>{maximized ? '⧉' : '□'}</button>
          <button type="button" className="title-bar-btn title-bar-close" onClick={() => appWindow.close()} aria-label="关闭">✕</button>
        </div>
      </div>
    </div>
  )
}

export default TitleBar
