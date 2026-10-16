import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Patient } from "../lib/types";
import { formatAge, formatDate, fullName } from "../lib/format";

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("patients")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(loadError.message);
        else setPatients((data as Patient[]) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((patient) => {
      const haystack = [
        patient.first_name,
        patient.last_name,
        patient.document_number,
        patient.phone,
        patient.insurance,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [patients, query]);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Agenda clínica
          </p>
          <h1 className="font-display mt-1 text-4xl">Pacientes</h1>
          <p className="mt-2 text-sm text-muted">
            {patients.length} historias en el consultorio
          </p>
        </div>
        <Link to="/pacientes/nuevo" className="btn-primary">
          Nuevo paciente
        </Link>
      </div>

      <div className="card mb-5 p-4">
        <input
          className="field"
          placeholder="Buscar por nombre, documento, teléfono u obra social"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="text-muted">Cargando pacientes...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && filtered.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-display text-2xl">Todavía no hay registros</p>
          <p className="mt-2 text-sm text-muted">
            Creá el primer paciente para empezar a documentar consultas.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map((patient) => {
          const age = formatAge(patient.birth_date);
          return (
            <Link
              key={patient.id}
              to={`/pacientes/${patient.id}`}
              className="card flex flex-col justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:border-teal/30 sm:flex-row sm:items-center"
            >
              <div>
                <h2 className="text-lg font-semibold">
                  {fullName(patient.first_name, patient.last_name)}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {patient.document_type} {patient.document_number}
                  {age != null ? ` · ${age}` : ""}
                  {patient.insurance ? ` · ${patient.insurance}` : ""}
                </p>
              </div>
              <div className="text-sm text-muted sm:text-right">
                <p>Actualizado {formatDate(patient.updated_at)}</p>
                {patient.allergies && (
                  <p className="mt-1 font-medium text-gold">Alergias registradas</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
