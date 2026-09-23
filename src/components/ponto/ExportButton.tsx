import { useState } from 'react'
import Papa from 'papaparse'
import { fetchEventsForExport, ExportedTimeEvent } from '../../hooks/useTimeEvents'
import { downloadTextFile } from '../../lib/employeeCsv'
import { EVENT_LABELS, Employee, EventCategory } from '../../types'

interface Props {
  category: EventCategory
  employees: Employee[]
  isOffToday: (department: string | null, shiftGroup: string | null) => boolean
}

const NOT_ARRIVED_LABEL: Record<EventCategory, string> = {
  shift: 'Não chegou',
  lunch: 'Não saiu',
}

const LUNCH_LIMIT_MS = 60 * 60 * 1000

interface ShiftExportRow {
  nome: string
  lms: string
  departamento: string
  escala: string
  tipo_batida: string
  data: string
  hora: string
  origem: string
}

interface LunchExportRow {
  nome: string
  lms: string
  departamento: string
  escala: string
  data: string
  hora_saida: string
  hora_volta: string
  duracao: string
  estourou_1h: string
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR')
}

function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
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

function buildShiftRows(
  events: ExportedTimeEvent[],
  includeMissing: boolean,
  employees: Employee[],
  isOffToday: (department: string | null, shiftGroup: string | null) => boolean,
  start: string,
  end: string,
): ShiftExportRow[] {
  const rows: ShiftExportRow[] = events.map((row) => {
    const date = new Date(row.event_time)
    return {
      nome: row.employees?.name ?? '',
      lms: row.employees?.badge_code ?? '',
      departamento: row.employees?.department ?? '',
      escala: row.employees?.shift_group ?? '',
      tipo_batida: EVENT_LABELS[row.event_type],
      data: date.toLocaleDateString('pt-BR'),
      hora: formatTime(row.event_time),
      origem: row.source,
    }
  })

  if (includeMissing) {
    const today = todayDateOnly()
    const activeEmployees = employees.filter((e) => e.active)

    for (const day of dateRange(start, end)) {
      const presentIds = new Set(
        events.filter((e) => e.event_type === 'check_in' && toLocalDateOnly(e.event_time) === day).map((e) => e.employee_id),
      )

      for (const employee of activeEmployees) {
        if (presentIds.has(employee.id)) continue
        if (day === today && isOffToday(employee.department, employee.shift_group)) continue

        rows.push({
          nome: employee.name,
          lms: employee.badge_code ?? '',
          departamento: employee.department ?? '',
          escala: employee.shift_group ?? '',
          tipo_batida: NOT_ARRIVED_LABEL.shift,
          data: toBrDate(day),
          hora: '—',
          origem: '—',
        })
      }
    }
  }

  return rows
}

function buildLunchRows(
  events: ExportedTimeEvent[],
  includeMissing: boolean,
  employees: Employee[],
  isOffToday: (department: string | null, shiftGroup: string | null) => boolean,
  start: string,
  end: string,
): LunchExportRow[] {
  interface Group {
    date: string
    employee: { name: string; badge_code: string | null; department: string | null; shift_group: string | null }
    out?: ExportedTimeEvent
    in?: ExportedTimeEvent
  }

  const groups = new Map<string, Group>()

  for (const event of events) {
    if (!event.employees) continue
    const date = toLocalDateOnly(event.event_time)
    const key = `${event.employee_id}|${date}`
    const group = groups.get(key) ?? { date, employee: event.employees }
    if (event.event_type === 'lunch_out') group.out = event
    if (event.event_type === 'lunch_in') group.in = event
    groups.set(key, group)
  }

  if (includeMissing) {
    const today = todayDateOnly()
    const activeEmployees = employees.filter((e) => e.active)

    for (const day of dateRange(start, end)) {
      for (const employee of activeEmployees) {
        const key = `${employee.id}|${day}`
        if (groups.has(key)) continue
        if (day === today && isOffToday(employee.department, employee.shift_group)) continue

        groups.set(key, {
          date: day,
          employee: {
            name: employee.name,
            badge_code: employee.badge_code,
            department: employee.department,
            shift_group: employee.shift_group,
          },
        })
      }
    }
  }

  const today = todayDateOnly()

  return Array.from(groups.values())
    .map(({ date, employee, out, in: lunchIn }) => {
      const durationMs =
        out && lunchIn
          ? new Date(lunchIn.event_time).getTime() - new Date(out.event_time).getTime()
          : out && date === today
            ? Date.now() - new Date(out.event_time).getTime()
            : null

      return {
        nome: employee.name,
        lms: employee.badge_code ?? '',
        departamento: employee.department ?? '',
        escala: employee.shift_group ?? '',
        data: toBrDate(date),
        hora_saida: out ? formatTime(out.event_time) : '—',
        hora_volta: lunchIn ? formatTime(lunchIn.event_time) : '—',
        duracao: durationMs !== null ? formatDuration(durationMs) : '—',
        estourou_1h: durationMs !== null ? (durationMs >= LUNCH_LIMIT_MS ? 'Sim' : 'Não') : '—',
      }
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome))
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

    const csv =
      category === 'lunch'
        ? Papa.unparse(buildLunchRows(events, includeMissing, employees, isOffToday, start, end))
        : Papa.unparse(buildShiftRows(events, includeMissing, employees, isOffToday, start, end))

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
