import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface ShiftCalendarRow {
  id: string
  work_date: string
  department: string
  shift_group: string
  is_dsr: boolean
}

export interface ShiftCalendarInput {
  work_date: string // YYYY-MM-DD
  department: string
  shift_group: string
  is_dsr: boolean
}

function todayDateOnly(): string {
  return new Date().toLocaleDateString('sv-SE') // formato AAAA-MM-DD
}

export function useShiftCalendar() {
  const [rows, setRows] = useState<ShiftCalendarRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('shift_calendar')
      .select('*')
      .eq('work_date', todayDateOnly())

    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setRows(data as ShiftCalendarRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const dsrKeysToday = useMemo(() => {
    return new Set(rows.filter((r) => r.is_dsr).map((r) => `${r.department}|${r.shift_group}`))
  }, [rows])

  function isOffToday(department: string | null, shiftGroup: string | null): boolean {
    if (!department || !shiftGroup) return false
    return dsrKeysToday.has(`${department}|${shiftGroup}`)
  }

  /** Insere/atualiza várias linhas do calendário de uma vez (importação por CSV). */
  async function importCalendar(inputs: ShiftCalendarInput[]) {
    const { error: err } = await supabase
      .from('shift_calendar')
      .upsert(inputs, { onConflict: 'work_date,department,shift_group' })
    if (!err) await reload()
    return err
  }

  return { rows, loading, error, reload, isOffToday, importCalendar }
}
