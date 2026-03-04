interface ConfirmDialogProps {
  open: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ open, title, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="modal-overlay">
      <section className="modal-content" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="modal-title">{title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          您确定要执行此操作吗？目前此操作属于破坏性操作，可能会移动或删除您本地的文件。请确认您已进行了备份。
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            确认执行
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmDialog