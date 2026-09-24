import { useMemo, useRef, useState } from 'react'
import type { Employee, TimeEvent } from '../../types'
import { expedicaoTxtTemplate, parseExpedicaoTxt, OndaRotas } from '../../lib/expedicaoTxt'
import { sortearExpedicao, SorteioRow, RotaNaoPreenchida } from '../../lib/expedicaoSorteio'
import { gerarExpedicaoPdf } from '../../lib/expedicaoPdf'
import { downloadTextFile } from '../../lib/employeeCsv'

interface Props {
  employees: Employee[]
  events: TimeEvent[]
}

type Turno = 'AM' | 'PM'

export default function ExpedicaoTab({ employees, events }: Props) {
  const [turno, setTurno] = useState<Turno>('PM')
  const [ondas, setOndas] = useState<OndaRotas[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<SorteioRow[] | null>(null)
  const [rotasNaoPreenchidas, setRotasNaoPreenchidas] = useState<RotaNaoPreenchida[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pool = useMemo(() => {
    const checkedInIds = new Set(events.filter((e) => e.event_type === 'check_in').map((e) => e.employee_id))
    const departamentosElegiveis = turno === 'PM' ? ['SVC PM'] : ['SVC AM', 'SVC PM']
    return employees.filter(
      (e) => e.active && e.department && departamentosElegiveis.includes(e.department) && checkedInIds.has(e.id),
    )
  }, [employees, events, turno])

  function handleFile(file: File) {
    setFileName(file.name)
    setError(null)
    setRows(null)
    setRotasNaoPreenchidas([])
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseExpedicaoTxt(text)
      if (parsed.length === 0) {
        setError('Não encontrei nenhuma onda nesse arquivo — confira o formato (ex.: "ONDA 1" seguido das rotas, uma por linha).')
        setOndas(null)
        return
      }
      setOndas(parsed)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleSortear() {
    if (!ondas) return
    if (pool.length === 0) {
      setError(`Nenhum colaborador elegível bateu ponto hoje pro turno ${turno}.`)
      return
    }
    setError(null)
    const resultado = sortearExpedicao(ondas, pool)
    setRows(resultado.rows)
    setRotasNaoPreenchidas(resultado.rotasNaoPreenchidas)
  }

  function handleBaixarPdf() {
    if (!ondas || !rows) return
    gerarExpedicaoPdf(turno, ondas, rows)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Expedição</h1>
        <p className="text-sm text-slate-500">
          Sorteia colaboradores que bateram ponto hoje pras rotas de cada onda e gera a tabela em PDF.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            {(['AM', 'PM'] as Turno[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTurno(t)
                  setRows(null)
                  setRotasNaoPreenchidas([])
                }}
                className={`rounded-md px-4 py-1.5 font-medium transition ${
                  turno === t ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                Expedição {t}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">
            {turno === 'PM'
              ? 'Sorteia só entre quem bateu ponto no SVC PM.'
              : 'Sorteia entre quem bateu ponto no SVC AM e no SVC PM.'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Escolher arquivo .txt (ondas e rotas)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
          <button
            onClick={() => downloadTextFile('modelo-ondas-rotas.txt', expedicaoTxtTemplate(), 'text/plain;charset=utf-8;')}
            className="ml-auto text-sm font-medium text-brand-700 hover:underline"
          >
            Baixar modelo .txt
          </button>
        </div>

        {ondas && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {ondas.map((o) => (
              <span key={o.onda}>
                Onda {o.onda}: <strong>{o.rotas.length}</strong> rotas
              </span>
            ))}
            <span className="ml-auto">
              {pool.length} colaboradores elegíveis hoje (Expedição {turno})
            </span>
          </div>
        )}

        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {rotasNaoPreenchidas.length > 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <strong>{rotasNaoPreenchidas.length} rota(s) não deu pra preencher</strong> — faltou gente elegível
            pra cobrir tudo sem repetir alguém na mesma onda:{' '}
            {rotasNaoPreenchidas.map((r) => `Onda ${r.onda}: ${r.rota}`).join('; ')}.
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleSortear}
            disabled={!ondas}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            Sortear
          </button>
          {rows && (
            <>
              <button
                onClick={handleSortear}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sortear de novo
              </button>
              <button
                onClick={handleBaixarPdf}
                className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Baixar PDF
              </button>
            </>
          )}
        </div>
      </div>

      {rows && ondas && (
        <div className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2 pr-3">Vaga</th>
                <th className="pb-2 pr-3">Colaborador</th>
                {ondas.map((o) => (
                  <th key={o.onda} className="pb-2 pr-3 text-center">
                    Onda {o.onda}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.employeeId}>
                  <td className="py-1.5 pr-3 text-slate-400">{row.vaga}</td>
                  <td className="py-1.5 pr-3 font-medium text-slate-800">{row.colaborador}</td>
                  {ondas.map((o) => (
                    <td key={o.onda} className="py-1.5 pr-3 text-center text-slate-600">
                      {row.rotasPorOnda[o.onda] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
