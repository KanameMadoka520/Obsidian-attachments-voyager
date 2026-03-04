import { useState } from 'react'
import type { OperationTask, RuntimeLogLine } from '../types'

interface StatusBarProps {
  orphanCount: number
  misplacedCount: number
  selectedCount: number
  totalCount: number
  logs: RuntimeLogLine[]
  scanning: boolean
  tasks: OperationTask[]
  onUndoTask: (taskId: string) => void
  onUndoEntry: (entryId: string) => void
  onClearThumbnailCache: () => void
}

function StatusBar({
  orphanCount, misplacedCount, selectedCount, totalCount,
  logs, scanning,
  tasks, onUndoTask, onUndoEntry, onClearThumbnailCache,
}: StatusBarProps) {
  const [expanded, setExpanded] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'logs' | 'history'>('logs')
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
          <div className="drawer-tabs">
            <button
              type="button"
              className={`drawer-tab ${drawerTab === 'logs' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setDrawerTab('logs') }}
            >
              日志
            </button>
            <button
              type="button"
              className={`drawer-tab ${drawerTab === 'history' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setDrawerTab('history') }}
            >
              操作历史 ({tasks.length})
            </button>
            <div className="drawer-tab-spacer" />
            <button
              type="button"
              className="drawer-tab-action"
              onClick={(e) => { e.stopPropagation(); onClearThumbnailCache() }}
            >
              清除缩略图缓存
            </button>
          </div>
          <div className="drawer-content">
            {drawerTab === 'logs' ? (
              logs.length === 0 ? (
                <div className="status-empty">暂无日志</div>
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
                <div className="status-empty">暂无操作历史</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.taskId} className="history-task">
                    <div className="history-task-header">
                      <span className="history-task-type">{task.taskType === 'fix' ? '修复' : '迁移'}</span>
                      <span className="history-task-time">{task.createdAt}</span>
                      <span className={`history-task-status status-${task.status}`}>{
                        ({ applied: '已执行', partiallyUndone: '部分撤回', undone: '已撤回' } as Record<string, string>)[task.status] ?? task.status
                      }</span>
                      {task.status !== 'undone' && (
                        <button
                          type="button"
                          className="btn-sm btn-sm-danger"
                          onClick={(e) => { e.stopPropagation(); onUndoTask(task.taskId) }}
                        >
                          全部撤回
                        </button>
                      )}
                    </div>
                    <div className="history-entries">
                      {task.entries.map((entry) => (
                        <div key={entry.entryId} className="history-entry">
                          <span className="history-entry-action">{entry.action === 'move' ? '移动' : '删除'}</span>
                          <span className="history-entry-path">{entry.filePath}</span>
                          <span className={`history-entry-status status-${entry.status}`}>{
                            ({ applied: '已执行', undone: '已撤回', failed: '失败', skipped: '跳过' } as Record<string, string>)[entry.status] ?? entry.status
                          }</span>
                          {entry.status === 'applied' && entry.action === 'move' && (
                            <button
                              type="button"
                              className="btn-sm"
                              onClick={(e) => { e.stopPropagation(); onUndoEntry(entry.entryId) }}
                            >
                              撤回
                            </button>
                          )}
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
