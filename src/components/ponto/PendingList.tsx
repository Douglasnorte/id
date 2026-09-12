import { useMemo } from 'react'
import { Employee, EVENT_LABELS, TimeEvent } from '../../types'
import { formatTime } from '../../lib/dateUtils'
import { nextEventFor } from '../../hooks/useTimeEvents'

interface Props {
  employees: Employee[]
  eventsFor: (employeeId: string) => TimeEvent[]
}

const STATUS_STYLES: Record<string, string> = {
  'Não chegou': 'bg-slate-100 text-slate-600',
  Presente: 'bg-emerald-100 text-emerald-700',
  'Em almoço': 'bg-amber-100 text-amber-700',
  Concluído: 'bg-slate-200 text-slate-700',
}

function statusLabel(next: ReturnType<typeof nextEventFor>, hasEvents: boolean): string {
  if (!hasEvents) return 'Não chegou'
  if (next === 'lunch_out') return 'Presente'
  if (next === 'lunch_in') return 'Em almoço'
  if (next === 'check_out') return 'Presente'
  return 'Concluído'
}

export default function PendingList({ employees, eventsFor }: Props) {
  const rows = useMemo(() => {
    return employees
      .filter((e) => e.active)
      .map((employee) => {
        const events = eventsFor(employee.id)
        const next = nextEventFor(events)
        const last = events[events.length - 1]
        return {
          employee,
          status: statusLabel(next, events.length > 0),
          lastEvent: last ?? null,
          done: next === null,
        }
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        return a.employee.name.localeCompare(b.employee.name)
      })
  }, [employees, eventsFor])

  const counts = useMemo(() => {
    const total = rows.length
    const naoChegou = rows.filter((r) => r.status === 'Não chegou').length
    const presente = rows.filter((r) => r.status === 'Presente').length
    const almoco = rows.filter((r) => r.status === 'Em almoço').length
    const concluido = rows.filter((r) => r.status === 'Concluído').length
    return { total, naoChegou, presente, almoco, concluido }
  }, [rows])

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Situação de hoje</h2>
        <span className="text-xs text-slate-400">{counts.total} colaboradores ativos</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox label="Não chegaram" value={counts.naoChegou} />
        <StatBox label="Presentes" value={counts.presente} />
        <StatBox label="Em almoço" value={counts.almoco} />
        <StatBox label="Concluídos" value={counts.concluido} />
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-2">Colaborador</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Última batida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ employee, status, lastEvent }) => (
              <tr key={employee.id}>
                <td className="py-2">
                  <div className="font-medium text-slate-800">{employee.name}</div>
                  <div className="text-xs text-slate-400">
                    {employee.department ?? '—'} · crachá {employee.badge_code}
                  </div>
                </td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
                    {status}
                  </span>
                </td>
                <td className="py-2 text-slate-500">
                  {lastEvent ? `${EVENT_LABELS[lastEvent.event_type]} às ${formatTime(lastEvent.event_time)}` : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate-400">
                  Nenhum colaborador ativo cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <div className="text-lg font-semibold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
