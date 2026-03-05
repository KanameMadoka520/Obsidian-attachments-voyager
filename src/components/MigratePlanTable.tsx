import { useLang } from '../App'

interface MigratePlanTableProps {
  items: string[]
}

function MigratePlanTable({ items }: MigratePlanTableProps) {
  const tr = useLang()
  return (
    <section className="card">
      <h2 className="card-title">{tr.migratePlanTitle}</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{tr.migratePlanColMapping}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="empty-state">{tr.migratePlanEmpty}</td>
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