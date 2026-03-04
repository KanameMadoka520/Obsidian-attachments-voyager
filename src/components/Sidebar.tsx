interface SidebarProps {
  category: 'orphan' | 'misplaced'
  onCategoryChange: (cat: 'orphan' | 'misplaced') => void
  orphanCount: number
  misplacedCount: number
  searchText: string
  onSearchChange: (text: string) => void
}

function Sidebar({
  category,
  onCategoryChange,
  orphanCount,
  misplacedCount,
  searchText,
  onSearchChange,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-heading">分类</div>
        <button
          type="button"
          className={`sidebar-item ${category === 'orphan' ? 'active' : ''}`}
          onClick={() => onCategoryChange('orphan')}
        >
          <span>Orphan</span>
          <span className="sidebar-badge">{orphanCount}</span>
        </button>
        <button
          type="button"
          className={`sidebar-item ${category === 'misplaced' ? 'active' : ''}`}
          onClick={() => onCategoryChange('misplaced')}
        >
          <span>Misplaced</span>
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
    </aside>
  )
}

export default Sidebar
