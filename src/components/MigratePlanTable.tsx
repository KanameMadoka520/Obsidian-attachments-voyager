import { useLang } from '../App'

interface MigratePlanTableProps {
  items: string[]
  title?: string
  columnLabel?: string
  emptyText?: string
}

function MigratePlanTable({ items, title, columnLabel, emptyText }: MigratePlanTableProps) {
  const tr = useLang()
  return (
    <section className="card">
      <h2 className="card-title">{title ?? tr.migratePlanTitle}</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{columnLabel ?? tr.migratePlanColMapping}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="empty-state">{emptyText ?? tr.migratePlanEmpty}</td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index}>
                  <td style={{ fontFamily: 'monospace' }}>{item}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default MigratePlanTable
