import { useEffect, useState } from 'react'
import { open } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import MigratePlanTable from '../components/MigratePlanTable'
import OperationHistoryPanel from '../components/OperationHistoryPanel'
import WorkLogPanel from '../components/WorkLogPanel'
import type { ConflictPolicy, OperationTask, RuntimeLogLine } from '../types'

interface MigrateSummary {
  taskId: string
  movedNotes: number
  movedAssets: number
}

interface UndoSummary {
  warnings: string[]
}

interface MigratePageProps {
  conflictPolicy: ConflictPolicy
}

function MigratePage({ conflictPolicy }: MigratePageProps) {
  const [notePath, setNotePath] = useState('')
  const [targetDir, setTargetDir] = useState('')
  const [previewItems, setPreviewItems] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [executing, setExecuting] = useState(false)
  const [logs, setLogs] = useState<RuntimeLogLine[]>([])
  const [tasks, setTasks] = useState<OperationTask[]>([])

  const refreshOps = async () => {
    try {
      const [fetchedLogs, fetchedTasks] = await Promise.all([
        invoke<RuntimeLogLine[]>('get_runtime_logs', { limit: 200 }),
        invoke<OperationTask[]>('list_operation_history'),
      ])
      setLogs(fetchedLogs)
      setTasks(fetchedTasks.slice().reverse())
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshOps()
    const timer = setInterval(refreshOps, 3000)
    return () => clearInterval(timer)
  }, [])

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

  const executeMigration = async (policy: ConflictPolicy = conflictPolicy) => {
    if (previewItems.length === 0) {
      setMessage('请先生成迁移预览再执行')
      return
    }

    setExecuting(true)
    try {
      const summary = await invoke<MigrateSummary>('execute_migration', {
        notePath: notePath.trim(),
        targetDir: targetDir.trim(),
        policy,
      })
      setMessage(`迁移完成：task=${summary.taskId}，笔记 ${summary.movedNotes}，附件 ${summary.movedAssets}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('CONFLICT')) {
        const overwrite = window.confirm('检测到重名冲突。确定选择“覆盖”吗？取消将使用“改名共存”。')
        await executeMigration(overwrite ? 'overwriteAll' : 'renameAll')
        return
      }
      setMessage(`迁移失败：${msg}`)
    } finally {
      setExecuting(false)
      await refreshOps()
    }
  }

  const handleUndoTask = async (taskId: string) => {
    const summary = await invoke<UndoSummary>('undo_task', { taskId })
    setMessage(summary.warnings.length > 0 ? summary.warnings.join('；') : '任务撤回完成')
    await refreshOps()
  }

  const handleUndoEntry = async (entryId: string) => {
    const summary = await invoke<UndoSummary>('undo_entry', { entryId })
    setMessage(summary.warnings.length > 0 ? summary.warnings.join('；') : '文件撤回完成')
    await refreshOps()
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
          <button type="button" className="btn btn-primary" onClick={() => executeMigration()} disabled={executing}>
            {executing ? '执行中...' : '执行迁移'}
          </button>
        </div>

        {message && (
          <div className={`alert ${message.includes('失败') || message.includes('无法找到') ? 'alert-error' : 'alert-success'}`} role="status">
            {message}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">工作原理说明（联动迁移）</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          联动迁移会把笔记与其关联附件按目标目录一起迁移，并在冲突时根据策略（弹窗/覆盖/改名共存）处理同名文件。
        </p>
      </section>

      <MigratePlanTable items={previewItems} />
      <WorkLogPanel logs={logs} />
      <OperationHistoryPanel tasks={tasks} onUndoTask={handleUndoTask} onUndoEntry={handleUndoEntry} />
    </div>
  )
}

export default MigratePage
