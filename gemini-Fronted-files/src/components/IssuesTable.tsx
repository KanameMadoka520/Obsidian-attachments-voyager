import type { AuditIssue } from '../types'

interface IssuesTableProps {
  issues: AuditIssue[]
}

function IssuesTable({ issues }: IssuesTableProps) {
  return (
    <section className="card">
      <h2 className="card-title">问题列表</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>类型</th>
              <th style={{ width: '45%' }}>图片路径</th>
              <th style={{ width: '40%' }}>原因</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty-state">
                  暂未发现问题，您的仓库非常整洁！🎉
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <span style={{ 
                      color: issue.type === 'orphan' ? 'var(--danger-color)' : 'var(--primary-color)',
                      fontWeight: 500
                    }}>
                      {issue.type}
                    </span>
                  </td>
                  <td style={{ wordBreak: 'break-all' }}>{issue.imagePath}</td>
                  <td>{issue.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default IssuesTable