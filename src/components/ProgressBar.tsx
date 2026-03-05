import { useLang } from '../App'

interface ScanProgress {
  phase: 'collecting' | 'parsing' | 'thumbnails'
  current: number
  total: number
}

interface ProgressBarProps {
  progress: ScanProgress | null
  visible: boolean
}

function ProgressBar({ progress, visible }: ProgressBarProps) {
  const tr = useLang()

  const PHASE_LABELS: Record<string, string> = {
    collecting: tr.progressCollecting,
    parsing: tr.progressParsing,
    thumbnails: tr.progressThumbnails,
  }

  if (!visible) return null

  if (!progress) {
    return (
      <div className="progress-bar-wrap">
        <div className="progress-bar-track">
          <div className="progress-bar-fill progress-bar-indeterminate" />
        </div>
        <span className="progress-bar-text">{tr.progressPreparing}</span>
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
