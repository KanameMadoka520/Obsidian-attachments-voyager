import { useState } from 'react'
import MigratePage from './pages/MigratePage'
import ScanPage from './pages/ScanPage'

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'migrate'>('scan')

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">Obsidian Attachments Voyager</div>
        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan')}
          >
            附件扫描
          </button>
          <button
            className={`tab-btn ${activeTab === 'migrate' ? 'active' : ''}`}
            onClick={() => setActiveTab('migrate')}
          >
            联动迁移
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'scan' ? <ScanPage /> : <MigratePage />}
      </main>

      <footer className="app-footer">
        GitHub: KanameMadoka520
      </footer>
    </div>
  )
}

export default App