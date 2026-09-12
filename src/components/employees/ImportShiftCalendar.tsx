import { useRef, useState } from 'react'
import type { ShiftCalendarInput } from '../../hooks/useShiftCalendar'
import { parseShiftCalendarCsv, ParsedCalendarRow, shiftCalendarCsvTemplate } from '../../lib/shiftCalendarCsv'
import { downloadTextFile } from '../../lib/employeeCsv'

interface Props {
  onImport: (rows: ShiftCalendarInput[]) => Promise<string | void>
  onClose: () => void
}

export default function ImportShiftCalendar({ onImport, onClose }: Props) {
  const [rows, setRows] = useState<ParsedCalendarRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setRows(parseShiftCalendarCsv(text))
    }
    reader.readAsText(file, 'utf-8')
  }

  const validRows = rows?.filter((r) => r.input) ?? []
  const invalidRows = rows?.filter((r) => !r.input) ?? []

  async function handleConfirm() {
    if (validRows.length === 0) return
    setImporting(true)
    setError(null)
    const err = await onImport(validRows.map((r) => r.input!))
    setImporting(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Importar calendário de escalas (DSR)</h2>
        <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:underline">
          Fechar
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Colunas: <code className="text-xs">data, departamento, escala, dsr</code>. Uma linha por
        combinação de data + departamento + escala (ex.: SVC AM, escala A). <code className="text-xs">dsr</code>{' '}
        aceita sim/nao, true/false ou 1/0. Reimportar uma mesma data/departamento/escala substitui o valor
        anterior.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Escolher arquivo CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
        {fileName && <span className="text-sm text-slate-500">{fileName}</span>}

        <button
          onClick={() => downloadTextFile('modelo-calendario-escalas.csv', shiftCalendarCsvTemplate())}
          className="ml-auto text-sm font-medium text-brand-700 hover:underline"
        >
          Baixar modelo CSV
        </button>
      </div>

      {rows && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="font-medium text-emerald-700">{validRows.length} prontos para importar</span>
            {invalidRows.length > 0 && (
              <span className="font-medium text-red-600">{invalidRows.length} com erro (serão ignorados)</span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Departamento</th>
                  <th className="px-3 py-2">Escala</th>
                  <th className="px-3 py-2">DSR</th>
                  <th className="px-3 py-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.row} className={r.error ? 'bg-red-50' : undefined}>
                    <td className="px-3 py-1.5 text-slate-400">{r.row}</td>
                    <td className="px-3 py-1.5">{r.input?.work_date ?? '—'}</td>
                    <td className="px-3 py-1.5 text-slate-500">{r.input?.department ?? '—'}</td>
                    <td className="px-3 py-1.5 text-slate-500">{r.input?.shift_group ?? '—'}</td>
                    <td className="px-3 py-1.5">{r.input ? (r.input.is_dsr ? 'Sim' : 'Não') : '—'}</td>
                    <td className="px-3 py-1.5">
                      {r.error ? (
                        <span className="text-red-600">{r.error}</span>
                      ) : (
                        <span className="text-emerald-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={validRows.length === 0 || importing}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {importing ? 'Importando...' : `Importar ${validRows.length} linhas`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
