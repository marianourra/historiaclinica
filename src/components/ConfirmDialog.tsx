type ConfirmDialogProps = {
  open: boolean;
  badge?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  badge = "Confirmación",
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Volver",
  pending = false,
  pendingLabel = "Procesando...",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        className="card w-full max-w-md p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
          {badge}
        </p>
        <h2
          id="confirm-dialog-title"
          className="font-display mt-2 text-2xl text-ink"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              danger
                ? "inline-flex items-center justify-center rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                : "btn-primary"
            }
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
