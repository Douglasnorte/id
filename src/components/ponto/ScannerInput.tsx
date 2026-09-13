import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { EVENT_LABELS, Employee, TimeEventType } from '../../types'

interface Props {
  onSubmit: (rawScan: string, overrideType: TimeEventType | null) => void
  active: boolean
  eventOptions: TimeEventType[]
  employees: Employee[]
}

const MAX_SUGGESTIONS = 6

/**
 * Campo único que atende leitor de código de barras/QR 2D (que funciona como
 * teclado e envia Enter ao final da leitura), digitação manual do número do
 * LMS e também busca pelo nome — útil para colaboradores que ainda não têm
 * o LMS cadastrado.
 */
export default function ScannerInput({ onSubmit, active, eventOptions, employees }: Props) {
  const [value, setValue] = useState('')
  const [overrideType, setOverrideType] = useState<TimeEventType | ''>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  function refocus() {
    // Pequeno atraso garante que o campo volte a receber o próximo bipe.
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const isNameQuery = /[a-zA-ZÀ-ÿ]/.test(value)
  const suggestions = useMemo(() => {
    const term = value.trim().toLowerCase()
    if (!isNameQuery || term.length < 2) return []
    return employees
      .filter((e) => e.active && e.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_SUGGESTIONS)
  }, [employees, value, isNameQuery])

  function submitValue(raw: string) {
    if (!raw.trim()) return
    onSubmit(raw, overrideType || null)
    setValue('')
    refocus()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submitValue(value)
  }

  if (!active) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Bipe o LMS, digite o número ou o nome do colaborador
        </label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          autoComplete="off"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg tracking-wide focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />

        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {suggestions.map((employee) => (
              <li key={employee.id}>
                <button
                  type="button"
                  onClick={() => submitValue(employee.name)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-brand-50"
                >
                  <span className="font-medium text-slate-800">{employee.name}</span>
                  <span className="text-xs text-slate-400">
                    {employee.department ?? '—'} · LMS {employee.badge_code ?? 'pendente'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">Tipo de batida:</label>
        <select
          value={overrideType}
          onChange={(e) => setOverrideType(e.target.value as TimeEventType | '')}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Automático (recomendado)</option>
          {eventOptions.map((type) => (
            <option key={type} value={type}>
              {EVENT_LABELS[type]}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="ml-auto rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Registrar
        </button>
      </div>
    </form>
  )
}
