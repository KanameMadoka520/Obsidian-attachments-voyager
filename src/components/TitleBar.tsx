import { appWindow } from '@tauri-apps/api/window'
import { useState, useEffect } from 'react'

interface TitleBarProps {
  activeTab: 'scan' | 'migrate'
  onTabChange: (tab: 'scan' | 'migrate') => void
}

function TitleBar({ activeTab, onTabChange }: TitleBarProps) {
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
        </nav>
      </div>
      <div className="title-bar-controls">
        <button type="button" className="title-bar-btn" onClick={() => appWindow.minimize()} aria-label="最小化">─</button>
        <button type="button" className="title-bar-btn" onClick={() => appWindow.toggleMaximize()} aria-label={maximized ? '还原' : '最大化'}>{maximized ? '⧉' : '□'}</button>
        <button type="button" className="title-bar-btn title-bar-close" onClick={() => appWindow.close()} aria-label="关闭">✕</button>
      </div>
    </div>
  )
}

export default TitleBar
