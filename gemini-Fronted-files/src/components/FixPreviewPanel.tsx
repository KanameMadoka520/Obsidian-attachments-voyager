import type { AuditIssue } from '../types'

interface FixPreviewPanelProps {
  issues: AuditIssue[]
  onExecute: () => void
}

function FixPreviewPanel({ issues, onExecute }: FixPreviewPanelProps) {
  if (issues.length === 0) return null; // 如果没有问题，不需要显示修复面板

  return (
    <section className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
      <h2 className="card-title">修复操作</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          发现 <strong>{issues.length}</strong> 个待修复项目。
          <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.9rem' }}>
            （执行修复前请确保已备份您的仓库）
          </span>
        </div>
        <button type="button" className="btn btn-danger" onClick={onExecute}>
          执行修复
        </button>
      </div>
    </section>
  )
}

export default FixPreviewPanel