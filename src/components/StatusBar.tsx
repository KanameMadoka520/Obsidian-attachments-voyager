import { useState } from 'react'
import type { RuntimeLogLine } from '../types'

interface StatusBarProps {
  orphanCount: number
  misplacedCount: number
  selectedCount: number
  totalCount: number
  logs: RuntimeLogLine[]
  scanning: boolean
}

function StatusBar({ orphanCount, misplacedCount, selectedCount, totalCount, logs, scanning }: StatusBarProps) {
  const [expanded, setExpanded] = useState(false)
  const latest = logs.length > 0 ? logs[logs.length - 1] : null

  return (
    <div className={`status-bar ${expanded ? 'expanded' : ''}`}>
      <div className="status-bar-summary" onClick={() => setExpanded(!expanded)}>
        <div className="status-bar-left">
          {scanning && <span className="status-indicator scanning" />}
          <span>Orphan: {orphanCount}</span>
          <span className="status-sep">|</span>
          <span>Misplaced: {misplacedCount}</span>
          <span className="status-sep">|</span>
          <span>已选: {selectedCount}/{totalCount}</span>
        </div>
        <div className="status-bar-right">
          {latest && (
            <span className={`status-log-line level-${latest.level}`}>
              {latest.message}
            </span>
          )}
          <span className="status-toggle">{expanded ? '▼' : '▲'}</span>
        </div>
      </div>
      {expanded && (
        <div className="status-bar-drawer">
          {logs.length === 0 ? (
            <div className="status-empty">暂无日志</div>
          ) : (
            logs.slice().reverse().map((log, i) => (
              <div key={i} className={`status-log-entry level-${log.level}`}>
                <span className="status-log-time">{log.timestamp}</span>
                <span className="status-log-level">{log.level.toUpperCase()}</span>
                <span className="status-log-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default StatusBar
