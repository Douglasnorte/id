import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { endOfTodayIso, startOfTodayIso } from '../lib/dateUtils'
import type { Employee, ScanSource, TimeEvent, TimeEventType } from '../types'

const NEXT_EVENT: Record<TimeEventType, TimeEventType | null> = {
  check_in: 'lunch_out',
  lunch_out: 'lunch_in',
  lunch_in: 'check_out',
  check_out: null,
}

export function nextEventFor(events: TimeEvent[]): TimeEventType | null {
  if (events.length === 0) return 'check_in'
  const last = events[events.length - 1]
  return NEXT_EVENT[last.event_type]
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
    overrideType?: TimeEventType,
  ): Promise<{ event?: TimeEvent; error?: string }> {
    const todaysEvents = eventsFor(employee.id)
    const type = overrideType ?? nextEventFor(todaysEvents)

    if (!type) {
      return { error: `${employee.name} já concluiu todas as batidas de hoje.` }
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
