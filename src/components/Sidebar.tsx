import type { RefObject } from 'react'
import type { SizeFilter } from '../types'
import { useLang } from '../App'

interface FileTypeGroup {
  key: string
  labelKey?: string
  label?: string
  extensions: string[]
}

const FILE_TYPE_GROUPS: FileTypeGroup[] = [
  { key: 'png', label: '.png', extensions: ['png'] },
  { key: 'jpg', label: '.jpg', extensions: ['jpg', 'jpeg'] },
  { key: 'gif', label: '.gif', extensions: ['gif'] },
  { key: 'svg', label: '.svg', extensions: ['svg'] },
  { key: 'webp', label: '.webp', extensions: ['webp'] },
  { key: 'other', labelKey: 'sidebarFileTypeOther', extensions: ['bmp'] },
]

const SIZE_OPTIONS: { value: SizeFilter; labelKey?: string; label?: string }[] = [
  { value: 'all', labelKey: 'sidebarSizeAll' },
  { value: 'small', label: '< 100 KB' },
  { value: 'medium', label: '100 KB – 1 MB' },
  { value: 'large', label: '> 1 MB' },
]

interface SidebarProps {
  category: 'orphan' | 'misplaced' | 'broken'
  onCategoryChange: (cat: 'orphan' | 'misplaced' | 'broken') => void
  orphanCount: number
  misplacedCount: number
  brokenCount: number
  searchText: string
  onSearchChange: (text: string) => void
  fileTypeFilter: Set<string>
  onFileTypeFilterChange: (types: Set<string>) => void
  typeCounts: Record<string, number>
  sizeFilter: SizeFilter
  onSizeFilterChange: (size: SizeFilter) => void
  searchInputRef?: RefObject<HTMLInputElement | null>
}

function Sidebar({
  category,
  onCategoryChange,
  orphanCount,
  misplacedCount,
  brokenCount,
  searchText,
  onSearchChange,
  fileTypeFilter,
  onFileTypeFilterChange,
  typeCounts,
  sizeFilter,
  onSizeFilterChange,
  searchInputRef,
}: SidebarProps) {
  const tr = useLang()

  const toggleType = (key: string) => {
    const next = new Set(fileTypeFilter)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    onFileTypeFilterChange(next)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {tr.sidebarFilterGuide}
        </p>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-heading">{tr.sidebarCategory}</div>
        <button
          type="button"
          className={`sidebar-item ${category === 'orphan' ? 'active' : ''}`}
          onClick={() => onCategoryChange('orphan')}
        >
          <span className="sidebar-item-label">
            <span>Orphan</span>
            <span className="sidebar-hint-wrap">
              <span className="sidebar-hint">?</span>
              <span className="sidebar-tooltip">{tr.sidebarOrphanTooltip}</span>
            </span>
          </span>
          <span className="sidebar-badge">{orphanCount}</span>
        </button>
        <button
          type="button"
          className={`sidebar-item ${category === 'misplaced' ? 'active' : ''}`}
          onClick={() => onCategoryChange('misplaced')}
        >
          <span className="sidebar-item-label">
            <span>Misplaced</span>
            <span className="sidebar-hint-wrap">
              <span className="sidebar-hint">?</span>
              <span className="sidebar-tooltip">{tr.sidebarMisplacedTooltip}</span>
            </span>
          </span>
          <span className="sidebar-badge">{misplacedCount}</span>
        </button>
        <button
          type="button"
          className={`sidebar-item ${category === 'broken' ? 'active' : ''}`}
          onClick={() => onCategoryChange('broken')}
        >
          <span className="sidebar-item-label">
            <span>Broken</span>
            <span className="sidebar-hint-wrap">
              <span className="sidebar-hint">?</span>
              <span className="sidebar-tooltip">{tr.sidebarBrokenTooltip}</span>
            </span>
          </span>
          <span className="sidebar-badge">{brokenCount}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">{tr.sidebarSearch}</div>
        <input
          ref={searchInputRef}
          type="text"
          className="sidebar-search"
          placeholder={tr.sidebarSearchPlaceholder}
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">{tr.sidebarFileType}</div>
        <div className="sidebar-filter-group">
          {FILE_TYPE_GROUPS.map((g) => (
            <label key={g.key} className="sidebar-filter-item">
              <input
                type="checkbox"
                checked={fileTypeFilter.has(g.key)}
                onChange={() => toggleType(g.key)}
              />
              <span className="sidebar-filter-label">{g.labelKey ? tr[g.labelKey as keyof typeof tr] : g.label}</span>
              <span className="sidebar-filter-count">{typeCounts[g.key] ?? 0}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">{tr.sidebarFileSize}</div>
        <div className="sidebar-filter-group">
          {SIZE_OPTIONS.map((opt) => (
            <label key={opt.value} className="sidebar-filter-item">
              <input
                type="radio"
                name="sizeFilter"
                checked={sizeFilter === opt.value}
                onChange={() => onSizeFilterChange(opt.value)}
              />
              <span className="sidebar-filter-label">{opt.labelKey ? tr[opt.labelKey as keyof typeof tr] : opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  )
}

export { FILE_TYPE_GROUPS }
export default Sidebar
