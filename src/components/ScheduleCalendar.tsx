import { useEffect, useMemo, useRef, useState } from "react";
import {
  isScheduleDay,
  parseLocalDateInput,
  toLocalDateInput,
} from "../lib/agenda";
import type { DoctorSchedule } from "../lib/types";

const WEEK_HEADERS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"] as const;

type ScheduleCalendarProps = {
  value: string;
  schedules: DoctorSchedule[];
  onChange: (day: string) => void;
  disabled?: boolean;
  minDate?: string;
};

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

function displayDate(value: string) {
  if (!value) return "Seleccionar fecha...";
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseLocalDateInput(value));
}

/** Monday-first grid cells for a month. */
function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ScheduleCalendar({
  value,
  schedules,
  onChange,
  disabled = false,
  minDate = toLocalDateInput(),
}: ScheduleCalendarProps) {
  const selected = value ? parseLocalDateInput(value) : null;
  const min = parseLocalDateInput(minDate);
  const initial = selected ?? new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    setViewYear(selected.getFullYear());
    setViewMonth(selected.getMonth());
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function canSelect(date: Date) {
    if (disabled) return false;
    if (date < min) return false;
    return isScheduleDay(date, schedules);
  }

  const hasSchedule = schedules.some((item) => item.active);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="field flex items-center justify-between gap-2 text-left capitalize"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={value ? "text-ink" : "text-muted"}>
          {displayDate(value)}
        </span>
        <span className="text-muted" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 z-30 mt-1 w-[12.75rem] rounded-lg border border-line bg-white p-2 shadow-lg"
          role="dialog"
          aria-label="Calendario de agenda"
        >
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <button
              type="button"
              className="grid size-6 place-items-center rounded border border-line bg-white text-sm leading-none text-ink hover:bg-sage/60"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <p className="text-xs font-semibold capitalize leading-none text-ink">
              {monthLabel(viewYear, viewMonth)}
            </p>
            <button
              type="button"
              className="grid size-6 place-items-center rounded border border-line bg-white text-sm leading-none text-ink hover:bg-sage/60"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase text-muted">
            {WEEK_HEADERS.map((label) => (
              <div key={label} className="py-0.5">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="size-6" />;
              }
              const key = toLocalDateInput(date);
              const enabled = canSelect(date);
              const isSelected = value === key;
              const isToday = key === toLocalDateInput();

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={[
                    "size-6 rounded text-[11px] leading-none transition",
                    enabled
                      ? "font-bold text-ink hover:bg-sage/70"
                      : "cursor-not-allowed font-normal text-muted/35",
                    isSelected ? "bg-teal text-white hover:bg-teal-dark" : "",
                    !isSelected && isToday && enabled
                      ? "ring-1 ring-teal/40"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={isSelected}
                  aria-label={key}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {!hasSchedule && (
            <p className="mt-1.5 text-[10px] leading-tight text-muted">
              Sin días de atención configurados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
