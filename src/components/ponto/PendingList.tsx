import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_EVENTS, Employee, EventCategory, TimeEvent } from '../../types'
import { formatTime } from '../../lib/dateUtils'

interface Props {
  category: EventCategory
  employees: Employee[]
  eventsFor: (employeeId: string) => TimeEvent[]
  isOffToday: (department: string | null, shiftGroup: string | null) => boolean
}

type StatusKey = 'notArrived' | 'in' | 'done' | 'off'

const STATUS_META: Record<EventCategory, Record<StatusKey, string>> = {
  shift: { notArrived: 'Não chegou', in: 'Presente', done: 'Concluído', off: 'Folga (DSR)' },
  lunch: { notArrived: 'Não saiu', in: 'Em almoço', done: 'Voltou', off: 'Folga (DSR)' },
}

const STATUS_STYLES: Record<EventCategory, Record<StatusKey, string>> = {
  shift: {
    notArrived: 'bg-slate-100 text-slate-600',
    in: 'bg-emerald-100 text-emerald-700',
    done: 'bg-slate-200 text-slate-700',
    off: 'bg-sky-100 text-sky-700',
  },
  lunch: {
    notArrived: 'bg-slate-100 text-slate-600',
    in: 'bg-amber-100 text-amber-700',
    done: 'bg-emerald-100 text-emerald-700',
    off: 'bg-sky-100 text-sky-700',
  },
}

const LUNCH_LIMIT_MS = 60 * 60 * 1000

function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
}

export default function PendingList({ category, employees, eventsFor, isOffToday }: Props) {
  const [firstType, secondType] = CATEGORY_EVENTS[category]
  const meta = STATUS_META[category]
  const styles = STATUS_STYLES[category]
  const isLunch = category === 'lunch'

  const departments = useMemo(() => {
    const set = new Set(
      employees
        .filter((e) => e.active && e.department)
        .map((e) => e.department as string),
    )
    return Array.from(set).sort()
  }, [employees])
  const [deptFilter, setDeptFilter] = useState<string>('all')

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isLunch) return
    const id = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(id)
  }, [isLunch])

  const rows = useMemo(() => {
    return employees
      .filter((e) => e.active)
      .filter((e) => deptFilter === 'all' || e.department === deptFilter)
      .map((employee) => {
        const events = eventsFor(employee.id)
        const firstEvent = events.find((e) => e.event_type === firstType) ?? null
        const secondEvent = events.find((e) => e.event_type === secondType) ?? null

        let statusKey: StatusKey = !firstEvent ? 'notArrived' : !secondEvent ? 'in' : 'done'
        if (statusKey === 'notArrived' && isOffToday(employee.department, employee.shift_group)) {
          statusKey = 'off'
        }
        const lastEvent = secondEvent ?? firstEvent

        const durationMs =
          isLunch && firstEvent
            ? (secondEvent ? new Date(secondEvent.event_time).getTime() : now) - new Date(firstEvent.event_time).getTime()
            : null
        const overLimit = durationMs !== null && durationMs >= LUNCH_LIMIT_MS

        return { employee, statusKey, lastEvent, durationMs, overLimit }
      })
      .sort((a, b) => {
        if (a.statusKey !== b.statusKey) {
          const order: StatusKey[] = ['in', 'notArrived', 'done', 'off']
          return order.indexOf(a.statusKey) - order.indexOf(b.statusKey)
        }
        return a.employee.name.localeCompare(b.employee.name)
      })
  }, [employees, eventsFor, firstType, secondType, isLunch, now, isOffToday, deptFilter])

  const counts = useMemo(() => {
    return {
      total: rows.length,
      notArrived: rows.filter((r) => r.statusKey === 'notArrived').length,
      in: rows.filter((r) => r.statusKey === 'in').length,
      done: rows.filter((r) => r.statusKey === 'done').length,
      off: rows.filter((r) => r.statusKey === 'off').length,
      overLimit: rows.filter((r) => r.statusKey === 'in' && r.overLimit).length,
    }
  }, [rows])

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Situação de hoje</h2>
        <div className="flex items-center gap-2">
          {departments.length > 1 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600"
            >
              <option value="all">Todos os departamentos</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs text-slate-400">{counts.total} colaboradores ativos</span>
        </div>
      </div>

      <div className={`mb-4 grid grid-cols-2 gap-2 ${isLunch ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
        <StatBox label={meta.notArrived} value={counts.notArrived} />
        <StatBox label={meta.in} value={counts.in} />
        <StatBox label={meta.done} value={counts.done} />
        <StatBox label={meta.off} value={counts.off} />
        {isLunch && <StatBox label="Acima de 1h" value={counts.overLimit} warn={counts.overLimit > 0} />}
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-2">Colaborador</th>
              <th className="pb-2">Status</th>
              {isLunch && <th className="pb-2">Tempo de almoço</th>}
              <th className="pb-2">Última batida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ employee, statusKey, lastEvent, durationMs, overLimit }) => (
              <tr key={employee.id}>
                <td className="py-2">
                  <div className="font-medium text-slate-800">{employee.name}</div>
                  <div className="text-xs text-slate-400">
                    {employee.department ?? '—'}
                    {employee.shift_group ? ` · escala ${employee.shift_group}` : ''} · crachá{' '}
                    {employee.badge_code ?? '—'}
                  </div>
                </td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[statusKey]}`}>
                    {meta[statusKey]}
                  </span>
                </td>
                {isLunch && (
                  <td className="py-2">
                    {durationMs === null ? (
                      '—'
                    ) : (
                      <span className={overLimit ? 'font-semibold text-red-600' : 'text-slate-600'}>
                        {formatDuration(durationMs)}
                        {overLimit && ' ⚠ estourou'}
                      </span>
                    )}
                  </td>
                )}
                <td className="py-2 text-slate-500">{lastEvent ? formatTime(lastEvent.event_time) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isLunch ? 4 : 3} className="py-6 text-center text-slate-400">
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

function StatBox({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${warn ? 'bg-red-50' : 'bg-slate-50'}`}>
      <div className={`text-lg font-semibold ${warn ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
      <div className={`text-xs ${warn ? 'text-red-500' : 'text-slate-500'}`}>{label}</div>
    </div>
  )
}
