import { useRef, useState } from 'react'
import type { Employee } from '../../types'
import { deleteEmployeesCsvTemplate, parseDeleteEmployeesCsv, ParsedDeleteRow } from '../../lib/deleteEmployeesCsv'
import { downloadTextFile } from '../../lib/employeeCsv'

interface Props {
  employees: Employee[]
  onDelete: (ids: string[]) => Promise<string | void>
  onClose: () => void
}

const STATUS_LABEL: Record<ParsedDeleteRow['status'], string> = {
  ok: 'Será excluído',
  not_found: 'Não encontrado',
  ambiguous: 'Nome duplicado',
  duplicate_in_file: 'Duplicado no arquivo',
}

const STATUS_STYLE: Record<ParsedDeleteRow['status'], string> = {
  ok: 'text-red-700',
  not_found: 'text-slate-400',
  ambiguous: 'text-amber-700',
  duplicate_in_file: 'text-amber-700',
}

const CONFIRM_WORD = 'EXCLUIR'

export default function DeleteEmployees({ employees, onDelete, onClose }: Props) {
  const [rows, setRows] = useState<ParsedDeleteRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setFileName(file.name)
    setError(null)
    setConfirmText('')
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setRows(parseDeleteEmployeesCsv(text, employees))
    }
    reader.readAsText(file, 'utf-8')
  }

  const applicable = rows?.filter((r) => r.status === 'ok') ?? []
  const skipped = rows?.filter((r) => r.status !== 'ok') ?? []
  const canConfirm = applicable.length > 0 && confirmText.trim().toUpperCase() === CONFIRM_WORD

  async function handleConfirm() {
    if (!canConfirm) return
    setApplying(true)
    setError(null)
    const err = await onDelete(applicable.map((r) => r.employee!.id))
    setApplying(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-red-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-red-700">Excluir colaboradores por nome</h2>
        <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:underline">
          Fechar
        </button>
      </div>

      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        <strong>Isso apaga o colaborador para sempre — inclusive todo o histórico de batidas dele</strong>, mesmo
        as de hoje. Não tem como desfazer. Se você só quer que a pessoa suma da lista de pendências (mas manter o
        histórico), use <strong>Editar → Desativar</strong> ou a coluna <code className="text-xs">status</code> em
        "Atualizar cadastro por nome" em vez disso.
      </div>

      <p className="text-sm text-slate-500">
        Suba um CSV com uma coluna <code className="text-xs">nome</code> — um colaborador por linha. O nome
        precisa bater exatamente com o já cadastrado.
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
          onClick={() => downloadTextFile('modelo-excluir-colaboradores.csv', deleteEmployeesCsvTemplate())}
          className="ml-auto text-sm font-medium text-brand-700 hover:underline"
        >
          Baixar modelo CSV
        </button>
      </div>

      {rows && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-medium text-red-700">{applicable.length} serão excluídos para sempre</span>
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
                  <th className="px-3 py-2">Situação</th>
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

          {applicable.length > 0 && (
            <label className="block text-sm text-slate-600">
              Digite <strong>{CONFIRM_WORD}</strong> para confirmar a exclusão de {applicable.length} colaboradores:
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                className="input mt-1 max-w-xs"
              />
            </label>
          )}

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || applying}
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {applying ? 'Excluindo...' : `Excluir ${applicable.length} colaboradores para sempre`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
