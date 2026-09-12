import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { endOfTodayIso, startOfTodayIso } from '../lib/dateUtils'
import { CATEGORY_EVENTS, type Employee, type EventCategory, type ScanSource, type TimeEvent, type TimeEventType } from '../types'

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

  useEffect(() => {
    reload()

    const channel = supabase
      .channel('time-events-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'time_events' }, () => reload())
      .subscribe()

    return () => {
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

  return { events, loading, error, reload, eventsFor, registerEvent }
}
