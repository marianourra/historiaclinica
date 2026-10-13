import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

type FieldKind = "text" | "textarea" | "date" | "email" | "select";

type Option = { value: string; label: string };

export function EditableField({
  label,
  value,
  displayValue,
  kind = "text",
  options,
  accent,
  wide,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  displayValue?: string;
  kind?: FieldKind;
  options?: Option[];
  accent?: boolean;
  wide?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setText(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) fieldRef.current?.focus();
  }, [editing]);

  async function persist(next: string) {
    if ((value ?? "") === next.trim()) {
      setEditing(false);
      return;
    }
    setStatus("saving");
    setMessage(null);
    try {
      await onSave(next);
      setStatus("saved");
      setEditing(false);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  function cancel() {
    setText(value ?? "");
    setEditing(false);
    setStatus("idle");
    setMessage(null);
  }

  return (
    <div className={`${wide ? "sm:col-span-2" : ""} rounded-2xl border bg-card p-4 ${accent && (value ?? "").trim() ? "border-gold/40" : "border-line"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="field-label !mb-0">{label}</p>
        {editing ? (
          <div className="flex gap-1">
            <IconButton label="Guardar" onClick={() => void persist(fieldRef.current?.value ?? text)}>
              <CheckIcon />
            </IconButton>
            <IconButton label="Cancelar" onClick={cancel}>
              <CloseIcon />
            </IconButton>
          </div>
        ) : (
          <IconButton label={`Editar ${label}`} onClick={() => setEditing(true)}>
            <PencilIcon />
          </IconButton>
        )}
      </div>
      {editing ? (
        kind === "textarea" ? (
          <textarea
            ref={fieldRef as RefObject<HTMLTextAreaElement>}
            className="field min-h-24"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setStatus("idle");
            }}
          />
        ) : kind === "select" ? (
          <select
            ref={fieldRef as RefObject<HTMLSelectElement>}
            className="field"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setStatus("idle");
            }}
          >
            {options?.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={fieldRef as RefObject<HTMLInputElement>}
            className="field"
            type={kind}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setStatus("idle");
            }}
          />
        )
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6">{displayValue || value || "—"}</p>
      )}
      {(status === "saving" || status === "saved" || status === "error") && (
        <p className={`mt-2 text-xs ${status === "error" ? "text-danger" : "text-muted"}`}>
          {status === "saving" && "Guardando..."}
          {status === "saved" && "Guardado"}
          {status === "error" && message}
        </p>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="grid h-8 w-8 place-items-center rounded-full text-teal hover:bg-sage"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
