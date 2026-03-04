interface ScanProgress {
  phase: 'collecting' | 'parsing' | 'thumbnails'
  current: number
  total: number
}

interface ProgressBarProps {
  progress: ScanProgress | null
  visible: boolean
}

const PHASE_LABELS: Record<string, string> = {
  collecting: '收集文件中...',
  parsing: '解析 Markdown...',
  thumbnails: '生成缩略图...',
}

function ProgressBar({ progress, visible }: ProgressBarProps) {
  if (!visible) return null

  if (!progress) {
    return (
      <div className="progress-bar-wrap">
        <div className="progress-bar-track">
          <div className="progress-bar-fill progress-bar-indeterminate" />
        </div>
        <span className="progress-bar-text">准备扫描...</span>
      </div>
    )
  }

  const { phase, current, total } = progress
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  const label = PHASE_LABELS[phase] ?? phase

  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-bar-text">
        {label} {current.toLocaleString()}/{total.toLocaleString()} ({percent}%)
      </span>
    </div>
  )
}

export type { ScanProgress }
export default ProgressBar
