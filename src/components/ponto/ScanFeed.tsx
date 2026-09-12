import { EVENT_LABELS, TimeEventType } from '../../types'

export interface ScanResult {
  id: string
  timestamp: number
  employeeName?: string
  eventType?: TimeEventType
  ok: boolean
  message: string
}

interface Props {
  results: ScanResult[]
}

export default function ScanFeed({ results }: Props) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 text-sm text-slate-400 shadow-sm">
        Os registros das últimas leituras aparecerão aqui.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {results.map((r) => (
        <div
          key={r.id}
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm shadow-sm ${
            r.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
          }`}
        >
          <div>
            <span className="font-medium">{r.employeeName ?? 'Leitura'}</span>
            {r.eventType && <span className="ml-2 text-xs opacity-75">{EVENT_LABELS[r.eventType]}</span>}
            <div className="text-xs opacity-75">{r.message}</div>
          </div>
          <span className="text-xs opacity-60">
            {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  )
}
