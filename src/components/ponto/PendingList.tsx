import { useMemo } from 'react'
import { CATEGORY_EVENTS, Employee, EventCategory, TimeEvent } from '../../types'
import { formatTime } from '../../lib/dateUtils'

interface Props {
  category: EventCategory
  employees: Employee[]
  eventsFor: (employeeId: string) => TimeEvent[]
}

type StatusKey = 'notArrived' | 'in' | 'done'

const STATUS_META: Record<EventCategory, Record<StatusKey, string>> = {
  shift: { notArrived: 'Não chegou', in: 'Presente', done: 'Concluído' },
  lunch: { notArrived: 'Não saiu', in: 'Em almoço', done: 'Voltou' },
}

const STATUS_STYLES: Record<EventCategory, Record<StatusKey, string>> = {
  shift: {
    notArrived: 'bg-slate-100 text-slate-600',
    in: 'bg-emerald-100 text-emerald-700',
    done: 'bg-slate-200 text-slate-700',
  },
  lunch: {
    notArrived: 'bg-slate-100 text-slate-600',
    in: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700',
  },
}

export default function PendingList({ category, employees, eventsFor }: Props) {
  const [firstType, secondType] = CATEGORY_EVENTS[category]
  const meta = STATUS_META[category]
  const styles = STATUS_STYLES[category]

  const rows = useMemo(() => {
    return employees
      .filter((e) => e.active)
      .map((employee) => {
        const events = eventsFor(employee.id)
        const firstEvent = events.find((e) => e.event_type === firstType) ?? null
        const secondEvent = events.find((e) => e.event_type === secondType) ?? null

        const statusKey: StatusKey = !firstEvent ? 'notArrived' : !secondEvent ? 'in' : 'done'
        const lastEvent = secondEvent ?? firstEvent

        return { employee, statusKey, lastEvent }
      })
      .sort((a, b) => {
        if (a.statusKey !== b.statusKey) {
          const order: StatusKey[] = ['in', 'notArrived', 'done']
          return order.indexOf(a.statusKey) - order.indexOf(b.statusKey)
        }
        return a.employee.name.localeCompare(b.employee.name)
      })
  }, [employees, eventsFor, firstType, secondType])

  const counts = useMemo(() => {
    return {
      total: rows.length,
      notArrived: rows.filter((r) => r.statusKey === 'notArrived').length,
      in: rows.filter((r) => r.statusKey === 'in').length,
      done: rows.filter((r) => r.statusKey === 'done').length,
    }
  }, [rows])

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Situação de hoje</h2>
        <span className="text-xs text-slate-400">{counts.total} colaboradores ativos</span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatBox label={meta.notArrived} value={counts.notArrived} />
        <StatBox label={meta.in} value={counts.in} />
        <StatBox label={meta.done} value={counts.done} />
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
            {rows.map(({ employee, statusKey, lastEvent }) => (
              <tr key={employee.id}>
                <td className="py-2">
                  <div className="font-medium text-slate-800">{employee.name}</div>
                  <div className="text-xs text-slate-400">
                    {employee.department ?? '—'} · crachá {employee.badge_code}
                  </div>
                </td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[statusKey]}`}>
                    {meta[statusKey]}
                  </span>
                </td>
                <td className="py-2 text-slate-500">{lastEvent ? formatTime(lastEvent.event_time) : '—'}</td>
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
