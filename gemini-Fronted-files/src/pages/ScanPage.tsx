import { useState } from 'react'
import { open } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import ConfirmDialog from '../components/ConfirmDialog'
import FixPreviewPanel from '../components/FixPreviewPanel'
import IssuesTable from '../components/IssuesTable'
import StatsCards from '../components/StatsCards'
import type { ScanResult } from '../types'

function ScanPage() {
  const [vaultPath, setVaultPath] = useState('')
  const [result, setResult] = useState<ScanResult | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pickDirectory = async () => {
    const selected = await open({ directory: true, multiple: false })
    if (typeof selected === 'string') {
      setVaultPath(selected)
    }
  }

  const runScan = async () => {
    if (!vaultPath.trim()) {
      setError('请先选择仓库路径')
      return
    }

    setLoading(true)
    setError('')

    try {
      const scanResult = await invoke<ScanResult>('scan_vault', { root: vaultPath })
      setResult(scanResult)
    } catch (e) {
      setResult(undefined)
      setError(e instanceof Error ? e.message : '扫描失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <section className="card">
        <h2 className="card-title">仓库配置</h2>
        <div className="input-group">
          <label htmlFor="vault-path" className="input-label">仓库路径</label>
          <input
            id="vault-path"
            className="input-field"
            value={vaultPath}
            onChange={(e) => setVaultPath(e.target.value)}
            placeholder="选择或输入 Obsidian 仓库路径..."
          />
          <button type="button" className="btn btn-secondary" onClick={pickDirectory}>
            选择目录
          </button>
          <button type="button" className="btn btn-primary" onClick={runScan} disabled={loading}>
            {loading ? '扫描中...' : '开始扫描'}
          </button>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
      </section>

      <StatsCards result={result} />
      
      {result && (
        <div className="results-wrapper">
          <IssuesTable issues={result.issues ?? []} />
          <FixPreviewPanel issues={result.issues ?? []} onExecute={() => setConfirmOpen(true)} />
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="确认执行修复"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)} // 实际执行逻辑后续可在此处扩展
      />
    </div>
  )
}

export default ScanPage