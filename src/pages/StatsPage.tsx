import { useMemo } from 'react'
import { useLang } from '../App'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { ScanResult, AuditIssue } from '../types'
import { formatSize } from '../lib/export'

interface StatsPageProps {
  result: ScanResult | null
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042']

function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function getParentDir(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) return '.'
  return normalized.substring(0, lastSlash) || '/'
}

function getExtension(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const basename = normalized.substring(normalized.lastIndexOf('/') + 1)
  const dotIndex = basename.lastIndexOf('.')
  if (dotIndex === -1) return 'other'
  let ext = basename.substring(dotIndex + 1).toLowerCase()
  if (ext === 'jpeg') ext = 'jpg'
  return ext
}

export default function StatsPage({ result }: StatsPageProps) {
  const tr = useLang()
  const orphanCount = useMemo(() => {
    if (!result) return 0
    return result.issues.filter((i) => i.type === 'orphan').length
  }, [result])

  const misplacedCount = useMemo(() => {
    if (!result) return 0
    return result.issues.filter((i) => i.type === 'misplaced').length
  }, [result])

  const brokenCount = useMemo(() => {
    if (!result) return 0
    return result.issues.filter((i) => i.type === 'broken').length
  }, [result])

  const issueTypePieData = useMemo(() => {
    return [
      { name: 'Orphan', value: orphanCount },
      { name: 'Misplaced', value: misplacedCount },
      { name: 'Broken', value: brokenCount },
    ].filter((d) => d.value > 0)
  }, [orphanCount, misplacedCount, brokenCount])

  const fileTypePieData = useMemo(() => {
    if (!result) return []
    const extMap: Record<string, number> = {}
    const knownExts = ['png', 'jpg', 'gif', 'svg', 'webp', 'bmp']
    result.issues.forEach((issue) => {
      let ext = getExtension(issue.imagePath)
      if (!knownExts.includes(ext)) ext = 'other'
      extMap[ext] = (extMap[ext] || 0) + 1
    })
    return Object.entries(extMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [result])

  const fileSizeData = useMemo(() => {
    if (!result) return []
    const ranges = [
      { name: '<100KB', min: 0, max: 100 * 1024 },
      { name: '100KB-1MB', min: 100 * 1024, max: 1024 * 1024 },
      { name: '1-5MB', min: 1024 * 1024, max: 5 * 1024 * 1024 },
      { name: '>5MB', min: 5 * 1024 * 1024, max: Infinity },
    ]
    const counts = ranges.map((r) => ({ name: r.name, count: 0 }))
    result.issues.forEach((issue) => {
      const size = issue.fileSize ?? 0
      for (let i = 0; i < ranges.length; i++) {
        if (size >= ranges[i].min && size < ranges[i].max) {
          counts[i].count++
          break
        }
      }
    })
    return counts
  }, [result])

  const topDirsData = useMemo(() => {
    if (!result) return []
    const dirMap: Record<string, number> = {}
    result.issues.forEach((issue) => {
      const dir = getParentDir(issue.imagePath)
      dirMap[dir] = (dirMap[dir] || 0) + 1
    })
    return Object.entries(dirMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [result])

  const timeData = useMemo(() => {
    if (!result) return []
    const monthMap: Record<string, number> = {}
    let hasTime = false
    result.issues.forEach((issue) => {
      if (issue.fileMtime != null && issue.fileMtime > 0) {
        hasTime = true
        const date = new Date(issue.fileMtime * 1000)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthMap[key] = (monthMap[key] || 0) + 1
      }
    })
    if (!hasTime) return []
    return Object.entries(monthMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [result])

  const duplicateFiles = useMemo(() => {
    if (!result) return []
    const groups: Record<string, AuditIssue[]> = {}
    result.issues.forEach((issue) => {
      if (issue.fileSize == null) return
      const normalized = issue.imagePath.replace(/\\/g, '/')
      const filename = normalized.substring(normalized.lastIndexOf('/') + 1)
      const key = `${filename}::${issue.fileSize}`
      if (!groups[key]) groups[key] = []
      groups[key].push(issue)
    })
    return Object.entries(groups)
      .filter(([, items]) => items.length >= 2)
      .map(([key, items]) => {
        const [filename] = key.split('::')
        return {
          filename,
          fileSize: items[0].fileSize!,
          count: items.length,
          paths: items.map((i) => i.imagePath),
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [result])

  const healthScore = useMemo(() => {
    if (!result || result.totalImages === 0) return null
    const total = result.totalImages
    const orphanRate = orphanCount / total
    const misplacedRate = misplacedCount / total
    const brokenRate = result.totalMd > 0 ? brokenCount / result.totalMd : 0
    // Weighted score: orphan 40%, misplaced 30%, broken 30%
    const penalty = orphanRate * 40 + misplacedRate * 30 + brokenRate * 30
    return Math.max(0, Math.round(100 - penalty * 100))
  }, [result, orphanCount, misplacedCount, brokenCount])

  if (!result) {
    return (
      <div className="stats-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p>{tr.statsNoData}</p>
      </div>
    )
  }

  const textColor = getCSSVar('--text-main')
  const gridColor = getCSSVar('--border-color')

  const orphanRate = result.totalImages > 0 ? (orphanCount / result.totalImages * 100).toFixed(1) : '0'
  const misplacedRate = result.totalImages > 0 ? (misplacedCount / result.totalImages * 100).toFixed(1) : '0'
  const brokenRate = result.totalMd > 0 ? (brokenCount / result.totalMd * 100).toFixed(1) : '0'

  return (
    <div className="stats-page" style={{ overflowY: 'auto' }}>
      <div style={{ padding: '8px 0 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p style={{ margin: '0 0 6px' }}>{tr.statsOverviewGuide}</p>
        <p style={{ margin: 0 }}>{tr.statsHealthGuide}</p>
      </div>
      {/* 0. Health Score */}
      {healthScore !== null && (
        <div className="stats-section">
          <h3 className="stats-section-title">{tr.healthScoreTitle}</h3>
          <div className="stats-cards">
            <div className="stats-card" style={{ minWidth: 160 }}>
              <div className="stats-card-value" style={{
                fontSize: '2.5rem',
                color: healthScore >= 80 ? 'var(--success-color, #4caf50)' : healthScore >= 50 ? 'var(--warning-color, #ff9800)' : 'var(--danger-color, #f44336)',
              }}>
                {healthScore}
              </div>
              <div className="stats-card-label">{tr.healthScoreLabel}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{orphanRate}%</div>
              <div className="stats-card-label">{tr.healthOrphanRate}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{misplacedRate}%</div>
              <div className="stats-card-label">{tr.healthMisplacedRate}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{brokenRate}%</div>
              <div className="stats-card-label">{tr.healthBrokenRate}</div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Overview Cards */}
      <div className="stats-section">
        <h3 className="stats-section-title">{tr.statsOverview}</h3>
        <div className="stats-cards">
          <div className="stats-card">
            <div className="stats-card-value">{result.totalMd}</div>
            <div className="stats-card-label">{tr.statsTotalMd}</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{result.totalImages}</div>
            <div className="stats-card-label">{tr.statsTotalImages}</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{result.issues.length}</div>
            <div className="stats-card-label">{tr.statsIssueCount}</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{orphanCount} / {misplacedCount} / {brokenCount}</div>
            <div className="stats-card-label">{tr.statsOrphanMisplacedBroken}</div>
          </div>
        </div>
      </div>

      {/* 2. Orphan vs Misplaced Pie Chart */}
      <div className="stats-section">
        <h3 className="stats-section-title">{tr.statsIssueTypeDist}</h3>
        <div className="stats-chart">
          <PieChart width={400} height={300}>
            <Pie
              data={issueTypePieData}
              cx={200}
              cy={130}
              outerRadius={100}
              dataKey="value"
              label
            >
              {issueTypePieData.map((_, index) => (
                <Cell key={`cell-type-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>

      {/* 3. File Type Distribution Pie Chart */}
      <div className="stats-section">
        <h3 className="stats-section-title">{tr.statsFileTypeDist}</h3>
        <div className="stats-chart">
          <PieChart width={400} height={300}>
            <Pie
              data={fileTypePieData}
              cx={200}
              cy={130}
              outerRadius={100}
              dataKey="value"
              label
            >
              {fileTypePieData.map((_, index) => (
                <Cell key={`cell-ext-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>

      {/* 4. File Size Distribution Bar Chart */}
      <div className="stats-section">
        <h3 className="stats-section-title">{tr.statsFileSizeDist}</h3>
        <div className="stats-chart">
          <BarChart width={500} height={300} data={fileSizeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: textColor }} />
            <YAxis tick={{ fill: textColor }} />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[0]} />
          </BarChart>
        </div>
      </div>

      {/* 5. Top 10 Problem Directories */}
      <div className="stats-section">
        <h3 className="stats-section-title">{tr.statsTopDirs}</h3>
        <div className="stats-chart">
          <BarChart
            width={600}
            height={Math.max(300, topDirsData.length * 40)}
            data={topDirsData}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis type="number" tick={{ fill: textColor }} />
            <YAxis
              type="category"
              dataKey="name"
              width={200}
              tick={{ fill: textColor, fontSize: 12 }}
            />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[1]} />
          </BarChart>
        </div>
      </div>

      {/* 6. File Time Distribution */}
      <div className="stats-section">
        <h3 className="stats-section-title">{tr.statsTimeDist}</h3>
        <div className="stats-chart">
          {timeData.length > 0 ? (
            <BarChart width={600} height={300} data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} />
              <YAxis tick={{ fill: textColor }} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS[4]} />
            </BarChart>
          ) : (
            <p>{tr.statsNoTimeData}</p>
          )}
        </div>
      </div>

      {/* 7. Duplicate Files Table */}
      <div className="stats-section">
        <h3 className="stats-section-title">{tr.statsDuplicateFiles}</h3>
        {duplicateFiles.length > 0 ? (
          <table className="stats-table">
            <thead>
              <tr>
                <th>{tr.statsDupFileName}</th>
                <th>{tr.statsDupSize}</th>
                <th>{tr.statsDupCount}</th>
                <th>{tr.statsDupPaths}</th>
              </tr>
            </thead>
            <tbody>
              {duplicateFiles.map((dup, idx) => (
                <tr key={idx}>
                  <td>{dup.filename}</td>
                  <td>{formatSize(dup.fileSize)}</td>
                  <td>{dup.count}</td>
                  <td>
                    <ul>
                      {dup.paths.map((p, pi) => (
                        <li key={pi}>{p}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>{tr.statsNoDuplicates}</p>
        )}
      </div>
    </div>
  )
}
