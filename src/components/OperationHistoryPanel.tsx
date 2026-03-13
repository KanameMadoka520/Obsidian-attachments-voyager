import { useState } from 'react'
import { useLang } from '../App'
import type { OperationTask } from '../types'

interface OperationHistoryPanelProps {
  tasks: OperationTask[]
}

function OperationHistoryPanel({ tasks }: OperationHistoryPanelProps) {
  const tr = useLang()
  const [open, setOpen] = useState(false)
  const taskTypeLabel = (taskType: string) => ({
    fix: tr.statusTaskTypeFix,
    migration: tr.statusTaskTypeMigration,
    'flatten-attachments': tr.statusTaskTypeFlatten,
  } as Record<string, string>)[taskType] ?? taskType

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>{tr.operationHistoryTitle}</h2>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? tr.operationHistoryCollapse : tr.operationHistoryExpand}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {tasks.length === 0 && <div className="empty-state">{tr.operationHistoryEmpty}</div>}
          {tasks.map((task) => (
            <div key={task.taskId} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <strong>{taskTypeLabel(task.taskType)}</strong> · {task.createdAt}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {task.entries.map((entry) => (
                  <div key={entry.entryId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{entry.filePath}</span>
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
