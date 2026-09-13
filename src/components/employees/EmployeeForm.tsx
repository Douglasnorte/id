import { FormEvent, ReactNode, useEffect, useState } from 'react'
import type { Employee } from '../../types'

export interface EmployeeFormValues {
  badge_code: string
  name: string
  department: string
  role: string
  shift_group: string
  shift_label: string
  notes: string
}

interface Props {
  initial?: Employee | null
  onCancel: () => void
  onSubmit: (values: EmployeeFormValues) => Promise<string | void>
}

const EMPTY: EmployeeFormValues = {
  badge_code: '',
  name: '',
  department: '',
  role: '',
  shift_group: '',
  shift_label: '',
  notes: '',
}

export default function EmployeeForm({ initial, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<EmployeeFormValues>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initial) {
      setValues({
        badge_code: initial.badge_code ?? '',
        name: initial.name,
        department: initial.department ?? '',
        role: initial.role ?? '',
        shift_group: initial.shift_group ?? '',
        shift_label: initial.shift_label ?? '',
        notes: initial.notes ?? '',
      })
    } else {
      setValues(EMPTY)
    }
  }, [initial])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const err = await onSubmit(values)
    setSubmitting(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">
        {initial ? `Editar colaborador — ${initial.name}` : 'Novo colaborador'}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Número do LMS">
          <input
            value={values.badge_code}
            onChange={(e) => setValues((v) => ({ ...v, badge_code: e.target.value.replace(/\D/g, '') }))}
            placeholder="Opcional — pode preencher depois"
            className="input"
          />
        </Field>

        <Field label="Nome completo" required>
          <input
            required
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="input"
          />
        </Field>

        <Field label="Departamento">
          <input
            value={values.department}
            onChange={(e) => setValues((v) => ({ ...v, department: e.target.value }))}
            className="input"
          />
        </Field>

        <Field label="Cargo">
          <input
            value={values.role}
            onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
            className="input"
          />
        </Field>

        <Field label="Turno/grupo da escala">
          <input
            value={values.shift_group}
            onChange={(e) => setValues((v) => ({ ...v, shift_group: e.target.value }))}
            placeholder="Ex: A, B, C, D"
            className="input"
          />
        </Field>

        <Field label="Descrição da escala">
          <input
            value={values.shift_label}
            onChange={(e) => setValues((v) => ({ ...v, shift_label: e.target.value }))}
            placeholder="Ex: 5x2 - 01:30 as 10:48"
            className="input"
          />
        </Field>
      </div>

      <Field label="Observações">
        <textarea
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          rows={2}
          className="input resize-none"
        />
      </Field>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Salvando...' : initial ? 'Salvar alterações' : 'Cadastrar'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}
