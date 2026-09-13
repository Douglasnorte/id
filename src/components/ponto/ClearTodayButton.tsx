import { useState } from 'react'

interface Props {
  label: string
  onConfirm: () => Promise<{ error?: string } | void>
}

export default function ClearTodayButton({ label, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setClearing(true)
    setError(null)
    const result = await onConfirm()
    setClearing(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-slate-400 hover:text-slate-600 hover:underline"
      >
        Limpar registros de hoje
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <span className="text-xs text-red-700">{label} Essa ação não pode ser desfeita.</span>
      <button
        onClick={handleConfirm}
        disabled={clearing}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {clearing ? 'Apagando...' : 'Sim, apagar tudo'}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs font-medium text-slate-500 hover:underline">
        Cancelar
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  )
}
