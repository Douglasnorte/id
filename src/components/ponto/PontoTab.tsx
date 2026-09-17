import { lazy, Suspense, useState } from 'react'
import ScannerInput from './ScannerInput'
import ScanFeed, { ScanResult } from './ScanFeed'
import PendingList from './PendingList'
import ExportButton from './ExportButton'
import ClearTodayButton from './ClearTodayButton'
import { extractBadgeCode } from '../../lib/badgeCode'
import { todayLabel } from '../../lib/dateUtils'
import { CATEGORY_EVENTS } from '../../types'
import type { Employee, EventCategory, ScanSource, TimeEvent, TimeEventType } from '../../types'

type Mode = 'leitor' | 'camera'

interface Props {
  category: EventCategory
  heading: string
  employees: Employee[]
  eventsFor: (employeeId: string) => TimeEvent[]
  isOffToday: (department: string | null, shiftGroup: string | null) => boolean
  registerEvent: (
    employee: Employee,
    source: ScanSource,
    category: EventCategory,
    overrideType?: TimeEventType,
  ) => Promise<{ event?: TimeEvent; error?: string }>
  deleteEvent: (eventId: string) => Promise<{ error?: string }>
  deleteAllToday: (category: EventCategory) => Promise<{ error?: string }>
}

const MAX_FEED_ITEMS = 15

const CameraScanner = lazy(() => import('./CameraScanner'))

export default function PontoTab({
  category,
  heading,
  employees,
  eventsFor,
  isOffToday,
  registerEvent,
  deleteEvent,
  deleteAllToday,
}: Props) {
  const [mode, setMode] = useState<Mode>('leitor')
  const [results, setResults] = useState<ScanResult[]>([])

  function pushResult(result: Omit<ScanResult, 'id' | 'timestamp'>) {
    setResults((prev) => [{ ...result, id: crypto.randomUUID(), timestamp: Date.now() }, ...prev].slice(0, MAX_FEED_ITEMS))
  }

  async function handleScan(raw: string, source: ScanSource, overrideType: TimeEventType | null) {
    const trimmed = raw.trim()
    if (!trimmed) {
      pushResult({ ok: false, message: `Leitura inválida: "${raw}"` })
      return
    }

    const code = extractBadgeCode(trimmed)
    const employee =
      employees.find((e) => code && e.badge_code === code) ??
      employees.find((e) => e.name.toLowerCase() === trimmed.toLowerCase())

    if (!employee) {
      pushResult({ ok: false, message: `Colaborador não encontrado (LMS ou nome: "${trimmed}")` })
      return
    }
    if (!employee.active) {
      pushResult({ ok: false, employeeName: employee.name, message: 'Colaborador inativo' })
      return
    }

    const { event, error } = await registerEvent(employee, source, category, overrideType ?? undefined)
    if (error) {
      pushResult({ ok: false, employeeName: employee.name, message: error })
      return
    }
    if (event) {
      pushResult({
        ok: true,
        employeeName: employee.name,
        eventType: event.event_type,
        message: 'Registrado com sucesso',
      })
    }
  }

  async function handleUndo(event: TimeEvent) {
    const employee = employees.find((e) => e.id === event.employee_id)
    const { error } = await deleteEvent(event.id)
    if (error) {
      pushResult({ ok: false, employeeName: employee?.name, message: `Não foi possível desfazer: ${error}` })
    } else {
      pushResult({ ok: true, employeeName: employee?.name, message: 'Registro desfeito' })
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
              <p className="text-sm capitalize text-slate-400">{todayLabel()}</p>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
              <button
                onClick={() => setMode('leitor')}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  mode === 'leitor' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                Leitor / Manual
              </button>
              <button
                onClick={() => setMode('camera')}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  mode === 'camera' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                Câmera do celular
              </button>
            </div>

            <ExportButton key={mode} category={category} employees={employees} isOffToday={isOffToday} />
            <ClearTodayButton
              label={`Isso vai apagar todas as batidas de hoje de "${heading}".`}
              onConfirm={() => deleteAllToday(category)}
            />
          </div>

          <ScannerInput
            active={mode === 'leitor'}
            eventOptions={CATEGORY_EVENTS[category]}
            employees={employees}
            onSubmit={(raw, overrideType) => handleScan(raw, 'scanner', overrideType)}
          />
          {mode === 'camera' && (
            <Suspense fallback={<p className="text-sm text-slate-400">Carregando câmera...</p>}>
              <CameraScanner active onDecode={(raw) => handleScan(raw, 'camera', null)} />
            </Suspense>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">Últimas leituras</h3>
          <ScanFeed results={results} />
        </div>
      </div>

      <div className="lg:col-span-2">
        <PendingList
          category={category}
          employees={employees}
          eventsFor={eventsFor}
          isOffToday={isOffToday}
          onUndo={handleUndo}
        />
      </div>
    </div>
  )
}
