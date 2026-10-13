import { useState, type ReactNode } from "react";
import type { InfantBirthData } from "../lib/types";

const FIELDS: { key: keyof InfantBirthData; label: string; wide?: boolean }[] = [
  { key: "gestational_age", label: "Edad gestacional al nacer" },
  { key: "birth_weight", label: "Peso al nacer" },
  { key: "pregnancy_serologies", label: "Serologías del embarazo", wide: true },
  { key: "apgar", label: "APGAR" },
];

export function InfantBirthHeader({
  data,
  editable,
  onChange,
}: {
  data: InfantBirthData;
  editable?: boolean;
  onChange?: (next: InfantBirthData) => void;
}) {
  return (
    <div className="card mb-5 grid gap-3 p-5 sm:grid-cols-2">
      <p className="field-label sm:col-span-2">Datos de nacimiento</p>
      {FIELDS.map((field) => (
        <HeaderField
          key={field.key}
          label={field.label}
          value={data[field.key] ?? ""}
          wide={field.wide}
          editable={editable}
          onChange={(value) => onChange?.({ ...data, [field.key]: value })}
        />
      ))}
    </div>
  );
}

function HeaderField({
  label,
  value,
  wide,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  wide?: boolean;
  editable?: boolean;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  function startEdit() {
    setText(value);
    setEditing(true);
  }

  function confirm() {
    onChange(text);
    setEditing(false);
  }

  function cancel() {
    setText(value);
    setEditing(false);
  }

  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        {editable &&
          (editing ? (
            <div className="flex gap-1">
              <IconButton label="Guardar" onClick={confirm}>
                <CheckIcon />
              </IconButton>
              <IconButton label="Cancelar" onClick={cancel}>
                <CloseIcon />
              </IconButton>
            </div>
          ) : (
            <IconButton label={`Editar ${label}`} onClick={startEdit}>
              <PencilIcon />
            </IconButton>
          ))}
      </div>
      {editing ? (
        <textarea
          className="field min-h-16"
          value={text}
          autoFocus
          onChange={(event) => setText(event.target.value)}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm font-semibold">{value || "—"}</p>
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
      className="grid h-7 w-7 place-items-center rounded-full text-teal hover:bg-sage"
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
