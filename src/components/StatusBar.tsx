import { useState } from 'react'
import type { OperationTask, RuntimeLogLine } from '../types'
import { useLang } from '../App'

interface StatusBarProps {
  orphanCount: number
  misplacedCount: number
  selectedCount: number
  totalCount: number
  logs: RuntimeLogLine[]
  scanning: boolean
  tasks: OperationTask[]
  onClearThumbnailCache: () => void
}

function StatusBar({
  orphanCount, misplacedCount, selectedCount, totalCount,
  logs, scanning,
  tasks, onClearThumbnailCache,
}: StatusBarProps) {
  const tr = useLang()
  const [expanded, setExpanded] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'logs' | 'history'>('logs')
  const latest = logs.length > 0 ? logs[logs.length - 1] : null
  const taskTypeLabel = (taskType: string) => ({
    fix: tr.statusTaskTypeFix,
    migration: tr.statusTaskTypeMigration,
    'flatten-attachments': tr.statusTaskTypeFlatten,
  } as Record<string, string>)[taskType] ?? taskType
  const actionLabel = (action: string) => ({
    move: tr.statusActionMove,
    delete: tr.statusActionDelete,
    'delete-dir': tr.statusActionDelete,
  } as Record<string, string>)[action] ?? action

  return (
    <div className={`status-bar ${expanded ? 'expanded' : ''}`}>
      <div className="status-bar-summary" onClick={() => setExpanded(!expanded)}>
        <div className="status-bar-left">
          {scanning && <span className="status-indicator scanning" />}
          <span>Orphan: {orphanCount}</span>
          <span className="status-sep">|</span>
          <span>Misplaced: {misplacedCount}</span>
          <span className="status-sep">|</span>
          <span>{tr.statusSelected.replace('{selected}', String(selectedCount)).replace('{total}', String(totalCount))}</span>
        </div>
        <div className="status-bar-right">
          {latest && (
            <span className={`status-log-line level-${latest.level}`}>
              {latest.message}
            </span>
          )}
          <button
            type="button"
            className="status-bar-clear-btn"
            onClick={(e) => { e.stopPropagation(); onClearThumbnailCache() }}
            title={tr.statusClearThumbnailCache}
          >
            {tr.statusClearThumbnailCache}
          </button>
          <span className="status-toggle">{expanded ? '▼' : '▲'}</span>
        </div>
      </div>
      {expanded && (
        <div className="status-bar-drawer">
          <div style={{ padding: '8px 12px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {tr.statusGuide}
          </div>
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab ${drawerTab === 'logs' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setDrawerTab('logs') }}
            >
              {tr.statusLogs}
            </button>
            <button
              type="button"
              className={`drawer-tab ${drawerTab === 'history' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setDrawerTab('history') }}
            >
              {tr.statusHistory.replace('{count}', String(tasks.length))}
            </button>
            <div className="drawer-tab-spacer" />
            <button
              type="button"
              className="drawer-tab-action"
              onClick={(e) => { e.stopPropagation(); onClearThumbnailCache() }}
            >
              {tr.statusClearThumbnailCache}
            </button>
          </div>
          <div className="drawer-content">
            {drawerTab === 'logs' ? (
              logs.length === 0 ? (
                <div className="status-empty">{tr.statusNoLogs}</div>
              ) : (
                logs.slice().reverse().map((log, i) => (
                  <div key={i} className={`status-log-entry level-${log.level}`}>
                    <span className="status-log-time">{log.timestamp}</span>
                    <span className="status-log-level">{log.level.toUpperCase()}</span>
                    <span className="status-log-msg">{log.message}</span>
                  </div>
                ))
              )
            ) : (
              tasks.length === 0 ? (
                <div className="status-empty">{tr.statusNoHistory}</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.taskId} className="history-task">
                    <div className="history-task-header">
                      <span className="history-task-type">{taskTypeLabel(task.taskType)}</span>
                      <span className="history-task-time">{task.createdAt}</span>
                      <span className={`history-task-status status-${task.status}`}>{
                        ({ applied: tr.statusApplied } as Record<string, string>)[task.status] ?? task.status
                      }</span>
                    </div>
                    <div className="history-entries">
                      {task.entries.map((entry) => (
                        <div key={entry.entryId} className="history-entry">
                          <span className="history-entry-action">{actionLabel(entry.action)}</span>
                          <span className="history-entry-path">{entry.filePath}</span>
                          <span className={`history-entry-status status-${entry.status}`}>{
                            ({ applied: tr.statusApplied, failed: tr.statusFailed, skipped: tr.statusSkipped } as Record<string, string>)[entry.status] ?? entry.status
                          }</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusBar
