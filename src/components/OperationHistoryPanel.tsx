import { useState } from 'react'
import type { OperationTask } from '../types'

interface OperationHistoryPanelProps {
  tasks: OperationTask[]
  onUndoTask: (taskId: string) => Promise<void>
  onUndoEntry: (entryId: string) => Promise<void>
}

function OperationHistoryPanel({ tasks, onUndoTask, onUndoEntry }: OperationHistoryPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>操作历史</h2>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? '收起' : '展开'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {tasks.length === 0 && <div className="empty-state">暂无历史操作</div>}
          {tasks.map((task) => (
            <div key={task.taskId} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <strong>{task.taskType}</strong> · {task.createdAt}
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => onUndoTask(task.taskId)}>
                  撤回整个任务
                </button>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {task.entries.map((entry) => (
                  <div key={entry.entryId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{entry.filePath}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={entry.status === 'undone'}
                      onClick={() => onUndoEntry(entry.entryId)}
                    >
                      撤回该文件
                    </button>
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
