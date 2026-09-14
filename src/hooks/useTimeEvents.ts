import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { endOfTodayIso, startOfTodayIso } from '../lib/dateUtils'
import { CATEGORY_EVENTS, type Employee, type EventCategory, type ScanSource, type TimeEvent, type TimeEventType } from '../types'

export interface ExportedTimeEvent {
  event_type: TimeEventType
  event_time: string
  source: ScanSource
  employees: {
    name: string
    badge_code: string | null
    department: string | null
    shift_group: string | null
  } | null
}

export function nextEventFor(events: TimeEvent[], category: EventCategory): TimeEventType | null {
  const [first, second] = CATEGORY_EVENTS[category]
  const hasFirst = events.some((e) => e.event_type === first)
  if (!hasFirst) return first
  const hasSecond = events.some((e) => e.event_type === second)
  if (!hasSecond) return second
  return null
}

export function useTimeEvents() {
  const [events, setEvents] = useState<TimeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('time_events')
      .select('*')
      .gte('event_time', startOfTodayIso())
      .lte('event_time', endOfTodayIso())
      .order('event_time', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setEvents(data as TimeEvent[])
    }
    setLoading(false)
  }, [])

  const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    reload()

    // Várias pessoas bipando ao mesmo tempo disparam vários eventos seguidos
    // — agrupa tudo numa única busca em vez de refazer a lista repetidas vezes.
    function scheduleReload() {
      if (reloadTimeout.current) clearTimeout(reloadTimeout.current)
      reloadTimeout.current = setTimeout(reload, 500)
    }

    const channel = supabase
      .channel('time-events-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'time_events' }, scheduleReload)
      .subscribe()

    return () => {
      if (reloadTimeout.current) clearTimeout(reloadTimeout.current)
      supabase.removeChannel(channel)
    }
  }, [reload])

  function eventsFor(employeeId: string): TimeEvent[] {
    return events.filter((event) => event.employee_id === employeeId)
  }

  async function registerEvent(
    employee: Employee,
    source: ScanSource,
    category: EventCategory,
    overrideType?: TimeEventType,
  ): Promise<{ event?: TimeEvent; error?: string }> {
    const todaysEvents = eventsFor(employee.id)
    const type = overrideType ?? nextEventFor(todaysEvents, category)

    if (!type) {
      const what = category === 'lunch' ? 'o almoço' : 'a entrada/saída'
      return { error: `${employee.name} já concluiu ${what} de hoje.` }
    }

    const { data, error: err } = await supabase
      .from('time_events')
      .insert({ employee_id: employee.id, event_type: type, source })
      .select()
      .single()

    if (err) return { error: err.message }

    setEvents((prev) => [...prev, data as TimeEvent])
    return { event: data as TimeEvent }
  }

  const RLS_BLOCKED_MESSAGE =
    'Nada foi apagado — o banco recusou silenciosamente (RLS). Rode de novo o supabase/schema.sql no SQL Editor para aplicar a permissão de exclusão de time_events.'

  /** Desfaz (apaga) um registro específico — para corrigir uma batida errada. */
  async function deleteEvent(eventId: string): Promise<{ error?: string }> {
    const { error: err, count } = await supabase
      .from('time_events')
      .delete({ count: 'exact' })
      .eq('id', eventId)
    if (err) return { error: err.message }
    if (!count) return { error: RLS_BLOCKED_MESSAGE }
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    return {}
  }

  /** Apaga todas as batidas de hoje de uma categoria (Entrada/Saída ou Almoço). */
  async function deleteAllToday(category: EventCategory): Promise<{ error?: string }> {
    const expectedCount = events.filter((e) => CATEGORY_EVENTS[category].includes(e.event_type)).length

    const { error: err, count } = await supabase
      .from('time_events')
      .delete({ count: 'exact' })
      .in('event_type', CATEGORY_EVENTS[category])
      .gte('event_time', startOfTodayIso())
      .lte('event_time', endOfTodayIso())

    if (err) return { error: err.message }
    if (expectedCount > 0 && !count) return { error: RLS_BLOCKED_MESSAGE }
    const removedTypes = new Set(CATEGORY_EVENTS[category])
    setEvents((prev) => prev.filter((e) => !removedTypes.has(e.event_type)))
    return {}
  }

  return { events, loading, error, reload, eventsFor, registerEvent, deleteEvent, deleteAllToday }
}

/**
 * Busca batidas de um período para exportação (independente do estado do
 * hook, que só mantém o dia de hoje em memória).
 */
export async function fetchEventsForExport(
  category: EventCategory,
  startIso: string,
  endIso: string,
): Promise<{ data?: ExportedTimeEvent[]; error?: string }> {
  const { data, error } = await supabase
    .from('time_events')
    .select('event_type, event_time, source, employees(name, badge_code, department, shift_group)')
    .in('event_type', CATEGORY_EVENTS[category])
    .gte('event_time', startIso)
    .lte('event_time', endIso)
    .order('event_time', { ascending: true })

  if (error) return { error: error.message }
  return { data: data as unknown as ExportedTimeEvent[] }
}
