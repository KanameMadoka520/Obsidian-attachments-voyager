import type { SizeFilter } from '../types'

const FILE_TYPE_GROUPS: { key: string; label: string; extensions: string[] }[] = [
  { key: 'png', label: '.png', extensions: ['png'] },
  { key: 'jpg', label: '.jpg', extensions: ['jpg', 'jpeg'] },
  { key: 'gif', label: '.gif', extensions: ['gif'] },
  { key: 'svg', label: '.svg', extensions: ['svg'] },
  { key: 'webp', label: '.webp', extensions: ['webp'] },
  { key: 'other', label: '其他', extensions: ['bmp'] },
]

const SIZE_OPTIONS: { value: SizeFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'small', label: '< 100 KB' },
  { value: 'medium', label: '100 KB – 1 MB' },
  { value: 'large', label: '> 1 MB' },
]

interface SidebarProps {
  category: 'orphan' | 'misplaced'
  onCategoryChange: (cat: 'orphan' | 'misplaced') => void
  orphanCount: number
  misplacedCount: number
  searchText: string
  onSearchChange: (text: string) => void
  fileTypeFilter: Set<string>
  onFileTypeFilterChange: (types: Set<string>) => void
  typeCounts: Record<string, number>
  sizeFilter: SizeFilter
  onSizeFilterChange: (size: SizeFilter) => void
}

function Sidebar({
  category,
  onCategoryChange,
  orphanCount,
  misplacedCount,
  searchText,
  onSearchChange,
  fileTypeFilter,
  onFileTypeFilterChange,
  typeCounts,
  sizeFilter,
  onSizeFilterChange,
}: SidebarProps) {
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
        <div className="sidebar-heading">分类</div>
        <button
          type="button"
          className={`sidebar-item ${category === 'orphan' ? 'active' : ''}`}
          onClick={() => onCategoryChange('orphan')}
        >
          <span className="sidebar-item-label">
            <span>Orphan</span>
            <span className="sidebar-hint-wrap">
              <span className="sidebar-hint">?</span>
              <span className="sidebar-tooltip">孤立附件：没有被任何 Markdown 文件引用的图片。修复操作会将其删除。</span>
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
              <span className="sidebar-tooltip">错位附件：图片未存放在引用它的 Markdown 文件所在的附件目录中。修复操作会将图片移动到正确位置，并自动更新 Markdown 中的引用链接。</span>
            </span>
          </span>
          <span className="sidebar-badge">{misplacedCount}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">搜索</div>
        <input
          type="text"
          className="sidebar-search"
          placeholder="文件名 / 路径..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">文件类型</div>
        <div className="sidebar-filter-group">
          {FILE_TYPE_GROUPS.map((g) => (
            <label key={g.key} className="sidebar-filter-item">
              <input
                type="checkbox"
                checked={fileTypeFilter.has(g.key)}
                onChange={() => toggleType(g.key)}
              />
              <span className="sidebar-filter-label">{g.label}</span>
              <span className="sidebar-filter-count">{typeCounts[g.key] ?? 0}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">文件大小</div>
        <div className="sidebar-filter-group">
          {SIZE_OPTIONS.map((opt) => (
            <label key={opt.value} className="sidebar-filter-item">
              <input
                type="radio"
                name="sizeFilter"
                checked={sizeFilter === opt.value}
                onChange={() => onSizeFilterChange(opt.value)}
              />
              <span className="sidebar-filter-label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  )
}

export { FILE_TYPE_GROUPS }
export default Sidebar
