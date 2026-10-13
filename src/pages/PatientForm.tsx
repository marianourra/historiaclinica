import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const emptyForm = {
  first_name: "",
  last_name: "",
  document_type: "DNI",
  document_number: "",
  birth_date: "",
  sex: "",
  phone: "",
  email: "",
  address: "",
  blood_type: "",
  insurance: "",
  allergies: "",
  medical_history: "",
  current_medications: "",
  notes: "",
};

export function PatientForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError(null);
    setPending(true);
    const { data, error: saveError } = await supabase
      .from("patients")
      .insert({
        created_by: user.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        document_type: form.document_type,
        document_number: form.document_number.trim(),
        birth_date: form.birth_date || null,
        sex: form.sex || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        blood_type: form.blood_type.trim() || null,
        insurance: form.insurance.trim() || null,
        allergies: form.allergies.trim() || null,
        medical_history: form.medical_history.trim() || null,
        current_medications: form.current_medications.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select("id")
      .single();

    setPending(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    navigate(`/pacientes/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <div className="mb-6">
        <BackLink to="/">← Volver a pacientes</BackLink>
        <h1 className="font-display mt-3 text-4xl">Nuevo paciente</h1>
      </div>

      <div className="card grid gap-4 p-6 sm:grid-cols-2">
        <label>
          <span className="field-label">Nombre</span>
          <input className="field" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
        </label>
        <label>
          <span className="field-label">Apellido</span>
          <input className="field" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
        </label>
        <label>
          <span className="field-label">Tipo de documento</span>
          <select className="field" value={form.document_type} onChange={(e) => update("document_type", e.target.value)}>
            <option>DNI</option>
            <option>Pasaporte</option>
            <option>LC</option>
            <option>LE</option>
            <option>Otro</option>
          </select>
        </label>
        <label>
          <span className="field-label">Número</span>
          <input className="field" value={form.document_number} onChange={(e) => update("document_number", e.target.value)} required />
        </label>
        <label>
          <span className="field-label">Fecha de nacimiento</span>
          <input className="field" type="date" value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} />
        </label>
        <label>
          <span className="field-label">Sexo</span>
          <select className="field" value={form.sex} onChange={(e) => update("sex", e.target.value)}>
            <option value="">No informado</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="X">Otro</option>
          </select>
        </label>
        <label>
          <span className="field-label">Teléfono</span>
          <input className="field" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </label>
        <label>
          <span className="field-label">Correo</span>
          <input className="field" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Domicilio</span>
          <input className="field" value={form.address} onChange={(e) => update("address", e.target.value)} />
        </label>
        <label>
          <span className="field-label">Grupo sanguíneo</span>
          <input className="field" value={form.blood_type} onChange={(e) => update("blood_type", e.target.value)} placeholder="A+, O-, ..." />
        </label>
        <label>
          <span className="field-label">Obra social / cobertura</span>
          <input className="field" value={form.insurance} onChange={(e) => update("insurance", e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Alergias</span>
          <textarea className="field min-h-24" value={form.allergies} onChange={(e) => update("allergies", e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Antecedentes</span>
          <textarea className="field min-h-24" value={form.medical_history} onChange={(e) => update("medical_history", e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Medicación habitual</span>
          <textarea className="field min-h-24" value={form.current_medications} onChange={(e) => update("current_medications", e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Notas</span>
          <textarea className="field min-h-24" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Guardando..." : "Guardar paciente"}
        </button>
        <Link to="/" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
