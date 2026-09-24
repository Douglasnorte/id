import { useMemo, useState } from 'react'
import type { Employee, TimeEvent } from '../../types'
import { expedicaoTxtTemplate, parseExpedicaoTxt, OndaRotas } from '../../lib/expedicaoTxt'
import { sortearExpedicao, Assignment } from '../../lib/expedicaoSorteio'
import { buildRows } from '../../lib/expedicaoRows'
import { gerarExpedicaoPdf } from '../../lib/expedicaoPdf'

interface Props {
  employees: Employee[]
  events: TimeEvent[]
}

type Turno = 'AM' | 'PM'

export default function ExpedicaoTab({ employees, events }: Props) {
  const [turno, setTurno] = useState<Turno>('PM')
  const [texto, setTexto] = useState('')
  const [ondas, setOndas] = useState<OndaRotas[] | null>(null)
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pool = useMemo(() => {
    const checkedInIds = new Set(events.filter((e) => e.event_type === 'check_in').map((e) => e.employee_id))
    const departamentosElegiveis = turno === 'PM' ? ['SVC PM'] : ['SVC AM', 'SVC PM']
    return employees.filter(
      (e) => e.active && e.department && departamentosElegiveis.includes(e.department) && checkedInIds.has(e.id),
    )
  }, [employees, events, turno])

  const nomesPool = useMemo(() => pool.map((e) => e.name).sort((a, b) => a.localeCompare(b)), [pool])

  const rows = useMemo(() => (assignments ? buildRows(assignments) : []), [assignments])

  const conflitos = useMemo(() => {
    if (!assignments) return []
    const vistos = new Set<string>()
    const dup = new Set<string>()
    for (const a of assignments) {
      const nome = a.colaborador.trim()
      if (!nome) continue
      const chave = `${a.onda}|${nome.toLowerCase()}`
      if (vistos.has(chave)) dup.add(`${nome} (Onda ${a.onda})`)
      vistos.add(chave)
    }
    return Array.from(dup)
  }, [assignments])

  const naoPreenchidas = useMemo(() => (assignments ? assignments.filter((a) => !a.colaborador.trim()).length : 0), [assignments])

  function handleCarregar() {
    setError(null)
    const parsed = parseExpedicaoTxt(texto)
    if (parsed.length === 0) {
      setError('Não encontrei nenhuma onda/rota nesse texto — cole no formato "onda" + tab/vírgula + "rota", uma por linha.')
      setOndas(null)
      setAssignments(null)
      return
    }
    setOndas(parsed)
    setAssignments(null)
  }

  function handleSortear() {
    if (!ondas) return
    if (pool.length === 0) {
      setError(`Nenhum colaborador elegível bateu ponto hoje pro turno ${turno}.`)
      return
    }
    setError(null)
    setAssignments(sortearExpedicao(ondas, pool))
  }

  function updateAssignmentAt(index: number, field: 'vaga' | 'rota' | 'colaborador', value: string) {
    setAssignments((prev) => {
      if (!prev) return prev
      return prev.map((a, i) => {
        if (i !== index) return a
        if (field === 'vaga') {
          const parsed = value.trim() === '' ? null : Number(value)
          return { ...a, vaga: parsed != null && Number.isNaN(parsed) ? a.vaga : parsed }
        }
        return { ...a, [field]: value }
      })
    })
  }

  function handleBaixarPdf() {
    if (!ondas || !assignments) return
    gerarExpedicaoPdf(turno, ondas, buildRows(assignments))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Expedição</h1>
        <p className="text-sm text-slate-500">
          Cole as ondas e rotas do dia, sorteia entre quem bateu ponto hoje e gera a tabela em PDF.
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
                  setAssignments(null)
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

        <label className="mb-1 block text-sm font-medium text-slate-700">Vagas, ondas e rotas</label>
        <p className="mb-2 text-xs text-slate-500">
          Cole aqui direto de uma planilha: três colunas, vaga, onda e rota (separadas por tab, vírgula ou ";"),
          uma linha por rota. Repetir a mesma vaga em ondas diferentes mantém a mesma pessoa sorteada nessa
          posição o dia todo, só mudando a rota. A vaga é opcional — colando só onda e rota, a numeração sai
          automática e o sorteio volta a ser independente por onda.
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={expedicaoTxtTemplate()}
          rows={8}
          className="input w-full resize-y font-mono text-xs"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleCarregar}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Carregar ondas e rotas
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

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleSortear}
            disabled={!ondas}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            Sortear
          </button>
          {assignments && (
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

      {assignments && ondas && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">
            <span>
              <strong>{rows.length}</strong> colaboradores com alguma rota
            </span>
            <span>
              <strong>{assignments.length}</strong> rotas no total
            </span>
            {naoPreenchidas > 0 && (
              <span className="font-medium text-amber-700">{naoPreenchidas} rota(s) sem colaborador</span>
            )}
            {conflitos.length > 0 && (
              <span className="font-medium text-red-600">
                Repetido na mesma onda: {conflitos.join(', ')}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-500">
              Painel de edição — clique nos campos pra ajustar rota ou colaborador antes de exportar.
            </p>
            <datalist id="expedicao-nomes">
              {nomesPool.map((nome) => (
                <option key={nome} value={nome} />
              ))}
            </datalist>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2 pr-3">Vaga</th>
                  <th className="pb-2 pr-3">Onda</th>
                  <th className="pb-2 pr-3">Rota</th>
                  <th className="pb-2 pr-3">Colaborador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a, index) => (
                  <tr key={`${a.onda}-${index}`}>
                    <td className="py-1.5 pr-3">
                      <input
                        type="number"
                        min={1}
                        value={a.vaga ?? ''}
                        onChange={(e) => updateAssignmentAt(index, 'vaga', e.target.value)}
                        placeholder="auto"
                        className="input w-20 py-1"
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-slate-500">{a.onda}</td>
                    <td className="py-1.5 pr-3">
                      <input
                        value={a.rota}
                        onChange={(e) => updateAssignmentAt(index, 'rota', e.target.value)}
                        className="input py-1"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        list="expedicao-nomes"
                        value={a.colaborador}
                        onChange={(e) => updateAssignmentAt(index, 'colaborador', e.target.value)}
                        placeholder="—"
                        className="input py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-500">Prévia da tabela final (como vai sair no PDF)</p>
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
                  <tr key={row.colaborador}>
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
        </div>
      )}
    </div>
  )
}
