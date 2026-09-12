import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Employee } from '../types'

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setEmployees(data as Employee[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()

    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => reload())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [reload])

  async function createEmployee(input: {
    badge_code: string
    name: string
    department?: string | null
    role?: string | null
    notes?: string | null
  }) {
    const { error: err } = await supabase.from('employees').insert({
      badge_code: input.badge_code,
      name: input.name,
      department: input.department || null,
      role: input.role || null,
      notes: input.notes || null,
    })
    if (!err) await reload()
    return err
  }

  async function updateEmployee(
    id: string,
    changes: Partial<Pick<Employee, 'name' | 'badge_code' | 'department' | 'role' | 'notes' | 'active'>>,
  ) {
    const { error: err } = await supabase.from('employees').update(changes).eq('id', id)
    if (!err) await reload()
    return err
  }

  async function setActive(id: string, active: boolean) {
    return updateEmployee(id, { active })
  }

  return { employees, loading, error, reload, createEmployee, updateEmployee, setActive }
}
