import { useLang } from '../App'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const tr = useLang()

  if (!open) return null

  return (
    <div className="modal-overlay">
      <section className="modal-content" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="modal-title">{title}</h2>
        {body ?? (
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {tr.confirmDefaultBody}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel ?? tr.confirmCancel}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel ?? tr.confirmOk}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmDialog
