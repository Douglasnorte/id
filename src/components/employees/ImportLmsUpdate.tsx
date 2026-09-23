import { useRef, useState } from 'react'
import type { Employee } from '../../types'
import { lmsUpdateCsvTemplate, parseLmsUpdateCsv, ParsedLmsRow } from '../../lib/lmsUpdateCsv'
import { downloadTextFile } from '../../lib/employeeCsv'

interface Props {
  employees: Employee[]
  onUpdate: (
    updates: {
      id: string
      name: string
      badge_code?: string
      department?: string
      role?: string
      shift_group?: string
      shift_label?: string
      employment_type?: string
      active?: boolean
    }[],
  ) => Promise<string | void>
  onClose: () => void
}

const STATUS_LABEL: Record<ParsedLmsRow['status'], string> = {
  ok: 'OK',
  unchanged: 'Já estava certo',
  conflict: 'Vai substituir',
  not_found: 'Não encontrado',
  ambiguous: 'Nome duplicado',
  duplicate_lms: 'LMS duplicado',
}

const STATUS_STYLE: Record<ParsedLmsRow['status'], string> = {
  ok: 'text-emerald-700',
  unchanged: 'text-slate-400',
  conflict: 'text-amber-700',
  not_found: 'text-red-600',
  ambiguous: 'text-red-600',
  duplicate_lms: 'text-red-600',
}

export default function ImportLmsUpdate({ employees, onUpdate, onClose }: Props) {
  const [rows, setRows] = useState<ParsedLmsRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setRows(parseLmsUpdateCsv(text, employees))
    }
    reader.readAsText(file, 'utf-8')
  }

  const applicable = rows?.filter((r) => r.status === 'ok' || r.status === 'conflict') ?? []
  const skipped = rows?.filter((r) => r.status !== 'ok' && r.status !== 'conflict') ?? []

  async function handleConfirm() {
    if (applicable.length === 0) return
    setApplying(true)
    setError(null)
    const err = await onUpdate(
      applicable.map((r) => ({
        id: r.employee!.id,
        name: r.employee!.name,
        badge_code: r.changes.badge_code,
        department: r.changes.department,
        role: r.changes.role,
        shift_group: r.changes.shift_group,
        shift_label: r.changes.shift_label,
        employment_type: r.changes.employment_type,
        active: r.changes.active,
      })),
    )
    setApplying(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Atualizar cadastro por nome</h2>
        <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:underline">
          Fechar
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Para colaboradores já cadastrados — atualiza os campos que vierem preenchidos, sem mexer no resto.
        Colunas aceitas: <code className="text-xs">nome, lms, departamento, cargo, escala, descrição escala, tipo, status</code>{' '}
        (só <code className="text-xs">nome</code> é obrigatório; as outras são opcionais e podem vir combinadas
        como quiser). A coluna <code className="text-xs">status</code> aceita "ativo"/"inativo" para desativar ou
        reativar em massa. O nome precisa bater exatamente com o já cadastrado.
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
          onClick={() => downloadTextFile('modelo-atualizar-cadastro.csv', lmsUpdateCsvTemplate())}
          className="ml-auto text-sm font-medium text-brand-700 hover:underline"
        >
          Baixar modelo CSV
        </button>
      </div>

      {rows && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-medium text-emerald-700">{applicable.length} prontos para atualizar</span>
            {skipped.length > 0 && (
              <span className="font-medium text-slate-500">{skipped.length} sem ação (veja a situação de cada um)</span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Situação / mudanças</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.row}>
                    <td className="px-3 py-1.5 text-slate-400">{r.row}</td>
                    <td className="px-3 py-1.5">{r.name || '—'}</td>
                    <td className={`px-3 py-1.5 ${STATUS_STYLE[r.status]}`}>{r.message || STATUS_LABEL[r.status]}</td>
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
              disabled={applicable.length === 0 || applying}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {applying ? 'Atualizando...' : `Atualizar ${applicable.length} colaboradores`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
