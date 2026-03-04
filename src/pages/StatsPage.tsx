import { useMemo } from 'react'
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

interface StatsPageProps {
  result: ScanResult | null
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042']

function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const orphanCount = useMemo(() => {
    if (!result) return 0
    return result.issues.filter((i) => i.type === 'orphan').length
  }, [result])

  const misplacedCount = useMemo(() => {
    if (!result) return 0
    return result.issues.filter((i) => i.type !== 'orphan').length
  }, [result])

  const issueTypePieData = useMemo(() => {
    return [
      { name: 'Orphan', value: orphanCount },
      { name: 'Misplaced', value: misplacedCount },
    ]
  }, [orphanCount, misplacedCount])

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

  if (!result) {
    return (
      <div className="stats-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p>请先在「附件扫描」页面执行扫描</p>
      </div>
    )
  }

  const textColor = getCSSVar('--text-main')
  const gridColor = getCSSVar('--border-color')

  return (
    <div className="stats-page" style={{ overflowY: 'auto' }}>
      {/* 1. Overview Cards */}
      <div className="stats-section">
        <h3 className="stats-section-title">仓库总览</h3>
        <div className="stats-cards">
          <div className="stats-card">
            <div className="stats-card-value">{result.totalMd}</div>
            <div className="stats-card-label">总 Markdown 文件</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{result.totalImages}</div>
            <div className="stats-card-label">总图片文件</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{result.issues.length}</div>
            <div className="stats-card-label">问题数</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{orphanCount} / {misplacedCount}</div>
            <div className="stats-card-label">孤立/错位</div>
          </div>
        </div>
      </div>

      {/* 2. Orphan vs Misplaced Pie Chart */}
      <div className="stats-section">
        <h3 className="stats-section-title">问题类型分布</h3>
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
        <h3 className="stats-section-title">文件类型分布</h3>
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
        <h3 className="stats-section-title">文件大小分布</h3>
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
        <h3 className="stats-section-title">问题目录 Top 10</h3>
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
        <h3 className="stats-section-title">文件时间分布</h3>
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
            <p>暂无时间数据</p>
          )}
        </div>
      </div>

      {/* 7. Duplicate Files Table */}
      <div className="stats-section">
        <h3 className="stats-section-title">重复文件检测</h3>
        {duplicateFiles.length > 0 ? (
          <table className="stats-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>大小</th>
                <th>数量</th>
                <th>路径列表</th>
              </tr>
            </thead>
            <tbody>
              {duplicateFiles.map((dup, idx) => (
                <tr key={idx}>
                  <td>{dup.filename}</td>
                  <td>{formatFileSize(dup.fileSize)}</td>
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
          <p>未检测到重复文件</p>
        )}
      </div>
    </div>
  )
}
