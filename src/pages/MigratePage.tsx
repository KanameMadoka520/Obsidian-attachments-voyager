import { useEffect, useState } from 'react'
import { open } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import { useLang } from '../App'
import MigratePlanTable from '../components/MigratePlanTable'
import OperationHistoryPanel from '../components/OperationHistoryPanel'
import WorkLogPanel from '../components/WorkLogPanel'
import type { ConflictPolicy, OperationTask, RuntimeLogLine } from '../types'

interface MigrateSummary {
  taskId: string
  movedNotes: number
  movedAssets: number
}

interface MigratePageProps {
  conflictPolicy: ConflictPolicy
}

function MigratePage({ conflictPolicy }: MigratePageProps) {
  const tr = useLang()
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
      setMessage(tr.migrateNoPathError)
      return
    }

    setPreviewItems([`${notePath.trim()} -> ${targetDir.trim()}`])
    setMessage(tr.migratePreviewGenerated)
  }

  const executeMigration = async (policy: ConflictPolicy = conflictPolicy) => {
    if (previewItems.length === 0) {
      setMessage(tr.migrateNoPreviewError)
      return
    }

    setExecuting(true)
    try {
      const summary = await invoke<MigrateSummary>('execute_migration', {
        notePath: notePath.trim(),
        targetDir: targetDir.trim(),
        policy,
      })
      setMessage(tr.migrateComplete.replace('{taskId}', summary.taskId).replace('{movedNotes}', String(summary.movedNotes)).replace('{movedAssets}', String(summary.movedAssets)))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('CONFLICT')) {
        const overwrite = window.confirm(tr.migrateConflictPrompt)
        await executeMigration(overwrite ? 'overwriteAll' : 'renameAll')
        return
      }
      setMessage(tr.migrateFailed.replace('{message}', msg))
    } finally {
      setExecuting(false)
      await refreshOps()
    }
  }

  return (
    <div className="page-wrapper">
      <section className="card">
        <h2 className="card-title">{tr.migrateConfigTitle}</h2>

        <div className="input-group">
          <label htmlFor="note-path" className="input-label">{tr.migrateSelectNote}</label>
          <input
            id="note-path"
            className="input-field"
            value={notePath}
            onChange={(e) => setNotePath(e.target.value)}
            placeholder={tr.migrateNotePlaceholder}
          />
        </div>

        <div className="input-group">
          <label htmlFor="target-dir" className="input-label">{tr.migrateTargetDir}</label>
          <input
            id="target-dir"
            className="input-field"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            placeholder={tr.migrateTargetPlaceholder}
          />
          <button type="button" className="btn btn-secondary" onClick={pickTargetDir}>
            {tr.migratePickDir}
          </button>
        </div>

        <div className="input-group" style={{ marginTop: '24px' }}>
          <button type="button" className="btn btn-secondary" onClick={previewPlan}>
            {tr.migratePreviewPlan}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => executeMigration()} disabled={executing}>
            {executing ? tr.migrateExecuting : tr.migrateExecute}
          </button>
        </div>

        {message && (
          <div className={`alert ${message.includes('失败') || message.includes('failed') || message.includes('Failed') ? 'alert-error' : 'alert-success'}`} role="status">
            {message}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">{tr.migrateExplainTitle}</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {tr.migrateExplainBody}
        </p>
      </section>

      <MigratePlanTable items={previewItems} />
      <WorkLogPanel logs={logs} />
      <OperationHistoryPanel tasks={tasks} />
    </div>
  )
}

export default MigratePage
