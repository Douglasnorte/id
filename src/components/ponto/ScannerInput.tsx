import { FormEvent, useEffect, useRef, useState } from 'react'
import { EVENT_LABELS, EVENT_ORDER, TimeEventType } from '../../types'

interface Props {
  onSubmit: (rawScan: string, overrideType: TimeEventType | null) => void
  active: boolean
}

/**
 * Campo único que atende leitor de código de barras/QR 2D (que funciona como
 * teclado e envia Enter ao final da leitura) e também a digitação manual do
 * número do crachá.
 */
export default function ScannerInput({ onSubmit, active }: Props) {
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit(value, overrideType || null)
    setValue('')
    refocus()
  }

  if (!active) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Bipe o crachá (leitor 2D) ou digite o número
        </label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={refocus}
          autoFocus
          placeholder="{12345} ou 12345"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg tracking-wide focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">Tipo de batida:</label>
        <select
          value={overrideType}
          onChange={(e) => setOverrideType(e.target.value as TimeEventType | '')}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Automático (recomendado)</option>
          {EVENT_ORDER.map((type) => (
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
