import { useState } from 'react'
import Papa from 'papaparse'
import { fetchEventsForExport } from '../../hooks/useTimeEvents'
import { downloadTextFile } from '../../lib/employeeCsv'
import { CATEGORY_EVENTS, EVENT_LABELS, Employee, EventCategory } from '../../types'

interface Props {
  category: EventCategory
  employees: Employee[]
  isOffToday: (department: string | null, shiftGroup: string | null) => boolean
}

const NOT_ARRIVED_LABEL: Record<EventCategory, string> = {
  shift: 'Não chegou',
  lunch: 'Não saiu',
}

interface ExportRow {
  nome: string
  lms: string
  departamento: string
  escala: string
  tipo_batida: string
  data: string
  hora: string
  origem: string
}

function todayDateOnly(): string {
  return new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD
}

function toLocalDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE')
}

function toBrDate(dateOnly: string): string {
  return new Date(`${dateOnly}T12:00:00`).toLocaleDateString('pt-BR')
}

/** Lista de datas (AAAA-MM-DD) entre início e fim, limitada a hoje — dias futuros não têm o que reportar. */
function dateRange(startStr: string, endStr: string): string[] {
  const cappedEnd = endStr > todayDateOnly() ? todayDateOnly() : endStr
  if (startStr > cappedEnd) return []

  const dates: string[] = []
  const cur = new Date(`${startStr}T12:00:00`)
  const last = new Date(`${cappedEnd}T12:00:00`)
  while (cur <= last) {
    dates.push(cur.toLocaleDateString('sv-SE'))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export default function ExportButton({ category, employees, isOffToday }: Props) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(todayDateOnly())
  const [end, setEnd] = useState(todayDateOnly())
  const [includeMissing, setIncludeMissing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setError(null)

    const startIso = new Date(`${start}T00:00:00`).toISOString()
    const endIso = new Date(`${end}T23:59:59.999`).toISOString()

    const { data, error: err } = await fetchEventsForExport(category, startIso, endIso)
    setExporting(false)

    if (err) {
      setError(err)
      return
    }

    const events = data ?? []

    const rows: ExportRow[] = events.map((row) => {
      const date = new Date(row.event_time)
      return {
        nome: row.employees?.name ?? '',
        lms: row.employees?.badge_code ?? '',
        departamento: row.employees?.department ?? '',
        escala: row.employees?.shift_group ?? '',
        tipo_batida: EVENT_LABELS[row.event_type],
        data: date.toLocaleDateString('pt-BR'),
        hora: date.toLocaleTimeString('pt-BR'),
        origem: row.source,
      }
    })

    if (includeMissing) {
      const firstType = CATEGORY_EVENTS[category][0]
      const today = todayDateOnly()
      const activeEmployees = employees.filter((e) => e.active)

      for (const day of dateRange(start, end)) {
        const presentIds = new Set(
          events
            .filter((e) => e.event_type === firstType && toLocalDateOnly(e.event_time) === day)
            .map((e) => e.employee_id),
        )

        for (const employee of activeEmployees) {
          if (presentIds.has(employee.id)) continue
          if (day === today && isOffToday(employee.department, employee.shift_group)) continue

          rows.push({
            nome: employee.name,
            lms: employee.badge_code ?? '',
            departamento: employee.department ?? '',
            escala: employee.shift_group ?? '',
            tipo_batida: NOT_ARRIVED_LABEL[category],
            data: toBrDate(day),
            hora: '—',
            origem: '—',
          })
        }
      }
    }

    const csv = Papa.unparse(rows)
    const label = category === 'lunch' ? 'almoco' : 'entrada-saida'
    downloadTextFile(`${label}-${start}_a_${end}.csv`, csv)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Exportar CSV
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <label className="flex items-center gap-1 text-xs text-slate-500">
        De
        <input
          type="date"
          value={start}
          max={end}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border border-slate-300 px-1.5 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        Até
        <input
          type="date"
          value={end}
          min={start}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border border-slate-300 px-1.5 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={includeMissing}
          onChange={(e) => setIncludeMissing(e.target.checked)}
        />
        Incluir quem não bateu ponto
      </label>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {exporting ? 'Exportando...' : 'Baixar CSV'}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs font-medium text-slate-500 hover:underline">
        Cancelar
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
