import { useLang } from '../App'
import { formatSize } from '../lib/export'

interface StatsCardsProps {
  totalImages: number
  totalSize: number
  filteredCount: number
}

function StatsCards({ totalImages, totalSize, filteredCount }: StatsCardsProps) {
  const tr = useLang()

  return (
    <div className="gallery-stats-cards">
      <div className="gallery-stat-card">
        <span className="gallery-stat-value">{totalImages.toLocaleString()}</span>
        <span className="gallery-stat-label">{tr.galleryStatsTotal}</span>
      </div>
      <div className="gallery-stat-card">
        <span className="gallery-stat-value">{formatSize(totalSize)}</span>
        <span className="gallery-stat-label">{tr.galleryStatsSize}</span>
      </div>
      {filteredCount !== totalImages && (
        <div className="gallery-stat-card">
          <span className="gallery-stat-value">{filteredCount.toLocaleString()}</span>
          <span className="gallery-stat-label">{tr.galleryStatsFiltered}</span>
        </div>
      )}
    </div>
  )
}

export default StatsCards
