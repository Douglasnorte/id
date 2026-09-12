import { useState } from 'react'
import Papa from 'papaparse'
import { fetchEventsForExport } from '../../hooks/useTimeEvents'
import { downloadTextFile } from '../../lib/employeeCsv'
import { EVENT_LABELS, EventCategory } from '../../types'

interface Props {
  category: EventCategory
}

function todayDateOnly(): string {
  return new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD
}

export default function ExportButton({ category }: Props) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(todayDateOnly())
  const [end, setEnd] = useState(todayDateOnly())
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

    const rows = (data ?? []).map((row) => {
      const date = new Date(row.event_time)
      return {
        nome: row.employees?.name ?? '',
        cracha: row.employees?.badge_code ?? '',
        departamento: row.employees?.department ?? '',
        escala: row.employees?.shift_group ?? '',
        tipo_batida: EVENT_LABELS[row.event_type],
        data: date.toLocaleDateString('pt-BR'),
        hora: date.toLocaleTimeString('pt-BR'),
        origem: row.source,
      }
    })

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
