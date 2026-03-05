import { useState } from 'react'
import { useLang } from '../App'
import type { RuntimeLogLine } from '../types'

interface WorkLogPanelProps {
  logs: RuntimeLogLine[]
}

function WorkLogPanel({ logs }: WorkLogPanelProps) {
  const tr = useLang()
  const [open, setOpen] = useState(false)

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none' }}>{tr.workLogTitle}</h2>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? tr.workLogCollapse : tr.workLogExpand}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12, maxHeight: 220, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {logs.length === 0 && <div className="empty-state">{tr.workLogEmpty}</div>}
          {logs.map((line, idx) => (
            <div key={`${line.timestamp}-${idx}`} style={{ padding: '4px 0', borderBottom: '1px dashed var(--border-color)' }}>
              [{line.timestamp}] {line.level.toUpperCase()} {line.message}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default WorkLogPanel
