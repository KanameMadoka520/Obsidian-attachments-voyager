import { useState } from 'react'
import { useLang } from '../App'
import { openDiagnosticsDir, openMisplacedFixDiagnostic } from '../lib/commands'
import type { OperationTask } from '../types'

interface OperationHistoryPanelProps {
  tasks: OperationTask[]
}

function OperationHistoryPanel({ tasks }: OperationHistoryPanelProps) {
  const tr = useLang()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const taskTypeLabel = (taskType: string) => ({
    fix: tr.statusTaskTypeFix,
    migration: tr.statusTaskTypeMigration,
    'flatten-attachments': tr.statusTaskTypeFlatten,
  } as Record<string, string>)[taskType] ?? taskType

  const handleOpenDiagnostic = async (taskId: string) => {
    try {
      await openMisplacedFixDiagnostic(taskId)
      setMessage('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessage(tr.operationHistoryDiagnosticFailed.replace('{message}', msg))
    }
  }

  const handleOpenDiagnosticDir = async () => {
    try {
      await openDiagnosticsDir()
      setMessage('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessage(tr.operationHistoryDiagnosticFailed.replace('{message}', msg))
    }
  }

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>{tr.operationHistoryTitle}</h2>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? tr.operationHistoryCollapse : tr.operationHistoryExpand}
        </button>
      </div>

      {message && (
        <div className="alert alert-error" style={{ marginTop: 12, marginBottom: 0 }}>
          {message}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {tasks.length === 0 && <div className="empty-state">{tr.operationHistoryEmpty}</div>}
          {tasks.map((task) => (
            <div key={task.taskId} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <strong>{taskTypeLabel(task.taskType)}</strong> · {task.createdAt}
                </div>
                {task.taskType === 'fix' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => handleOpenDiagnostic(task.taskId)}>
                      {tr.operationHistoryOpenDiagnostic}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleOpenDiagnosticDir}>
                      {tr.operationHistoryOpenDiagnosticDir}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {task.entries.map((entry) => (
                  <div key={entry.entryId} style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{entry.filePath}</span>
                    {entry.message && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{entry.message}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default OperationHistoryPanel
