import { useState } from 'react'
import { open } from '@tauri-apps/api/dialog'
import MigratePlanTable from '../components/MigratePlanTable'

function MigratePage() {
  const [notePath, setNotePath] = useState('')
  const [targetDir, setTargetDir] = useState('')
  const [previewItems, setPreviewItems] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const pickTargetDir = async () => {
    const selected = await open({ directory: true, multiple: false })
    if (typeof selected === 'string') {
      setTargetDir(selected)
      setMessage('')
    }
  }

  const previewPlan = () => {
    if (!notePath.trim() || !targetDir.trim()) {
      setPreviewItems([])
      setMessage('请先填写笔记路径和目标目录')
      return
    }

    setPreviewItems([`${notePath.trim()} -> ${targetDir.trim()}`])
    setMessage('已生成迁移预览')
  }

  const executeMigration = () => {
    if (previewItems.length === 0) {
      setMessage('请先生成迁移预览再执行')
      return
    }

    setMessage('迁移执行功能待后端接入（当前为前端流程验证）')
  }

  return (
    <div className="page-wrapper">
      <section className="card">
        <h2 className="card-title">迁移配置</h2>
        
        <div className="input-group">
          <label htmlFor="note-path" className="input-label">选择笔记</label>
          <input
            id="note-path"
            className="input-field"
            value={notePath}
            onChange={(e) => setNotePath(e.target.value)}
            placeholder="输入或选择要迁移的笔记路径..."
          />
        </div>

        <div className="input-group">
          <label htmlFor="target-dir" className="input-label">目标目录</label>
          <input
            id="target-dir"
            className="input-field"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            placeholder="输入或选择目标目录..."
          />
          <button type="button" className="btn btn-secondary" onClick={pickTargetDir}>
            选择目录
          </button>
        </div>

        <div className="input-group" style={{ marginTop: '24px' }}>
          <button type="button" className="btn btn-secondary" onClick={previewPlan}>
            预览迁移计划
          </button>
          <button type="button" className="btn btn-primary" onClick={executeMigration}>
            执行迁移
          </button>
        </div>

        {message && (
          <div className={`alert ${message.includes('待后端接入') || message.includes('生成') ? 'alert-success' : 'alert-error'}`} role="status">
            {message}
          </div>
        )}
      </section>

      <MigratePlanTable items={previewItems} />
    </div>
  )
}

export default MigratePage