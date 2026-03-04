interface MigratePlanTableProps {
  items: string[]
}

function MigratePlanTable({ items }: MigratePlanTableProps) {
  return (
    <section className="card">
      <h2 className="card-title">迁移预览视图</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>迁移指令路径映射</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="empty-state">尚无生成的迁移计划，请先配置路径并点击预览</td>
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