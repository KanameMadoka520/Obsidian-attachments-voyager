import type { ScanResult } from '../types'

interface StatsCardsProps {
  result?: ScanResult
}

function StatsCards({ result }: StatsCardsProps) {
  const orphanCount = result?.issues.filter((i) => i.type === 'orphan').length ?? 0
  const misplacedCount = result?.issues.filter((i) => i.type === 'misplaced').length ?? 0

  return (
    <section className="stats-grid">
      <div className="stat-item">
        <div className="stat-label">Markdown 文件数</div>
        <div className="stat-value">{result?.totalMd ?? '-'}</div>
      </div>
      <div className="stat-item">
        <div className="stat-label">图片总数</div>
        <div className="stat-value">{result?.totalImages ?? '-'}</div>
      </div>
      <div className="stat-item">
        <div className="stat-label">未引用图片 (Orphan)</div>
        <div className="stat-value" style={{ color: orphanCount > 0 ? 'var(--danger-color)' : '' }}>
          {result ? orphanCount : '-'}
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-label">错位图片 (Misplaced)</div>
        <div className="stat-value" style={{ color: misplacedCount > 0 ? 'var(--danger-color)' : '' }}>
          {result ? misplacedCount : '-'}
        </div>
      </div>
    </section>
  )
}

export default StatsCards