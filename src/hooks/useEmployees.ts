import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Employee } from '../types'

export interface EmployeeInput {
  badge_code?: string | null
  name: string
  department?: string | null
  role?: string | null
  shift_group?: string | null
  shift_label?: string | null
  employment_type?: string | null
  notes?: string | null
}

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

  const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    reload()

    // Uma importação em lote dispara um evento por linha — agrupa tudo numa
    // única busca em vez de refazer a lista centenas de vezes seguidas.
    function scheduleReload() {
      if (reloadTimeout.current) clearTimeout(reloadTimeout.current)
      reloadTimeout.current = setTimeout(reload, 500)
    }

    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, scheduleReload)
      .subscribe()

    return () => {
      if (reloadTimeout.current) clearTimeout(reloadTimeout.current)
      supabase.removeChannel(channel)
    }
  }, [reload])

  async function createEmployee(input: EmployeeInput) {
    const { error: err } = await supabase.from('employees').insert({
      badge_code: input.badge_code || null,
      name: input.name,
      department: input.department || null,
      role: input.role || null,
      shift_group: input.shift_group || null,
      shift_label: input.shift_label || null,
      employment_type: input.employment_type || null,
      notes: input.notes || null,
    })
    if (!err) await reload()
    return err
  }

  async function updateEmployee(
    id: string,
    changes: Partial<
      Pick<
        Employee,
        'name' | 'badge_code' | 'department' | 'role' | 'shift_group' | 'shift_label' | 'employment_type' | 'notes' | 'active'
      >
    >,
  ) {
    const { error: err } = await supabase.from('employees').update(changes).eq('id', id)
    if (!err) await reload()
    return err
  }

  async function setActive(id: string, active: boolean) {
    return updateEmployee(id, { active })
  }

  /** Insere vários colaboradores de uma vez (importação por CSV). */
  async function importEmployees(inputs: EmployeeInput[]) {
    const rows = inputs.map((input) => ({
      badge_code: input.badge_code || null,
      name: input.name,
      department: input.department || null,
      role: input.role || null,
      shift_group: input.shift_group || null,
      shift_label: input.shift_label || null,
      employment_type: input.employment_type || null,
      notes: input.notes || null,
    }))
    const { error: err } = await supabase.from('employees').insert(rows)
    if (!err) await reload()
    return err
  }

  /**
   * Atualiza campos (LMS, departamento, cargo, turno, escala) de vários
   * colaboradores já cadastrados de uma vez (por id, importação por nome).
   * O upsert do Postgres valida colunas NOT NULL (como "name") antes de
   * resolver o conflito, mesmo quando o resultado é um UPDATE — por isso
   * o nome atual precisa vir junto, mesmo sem mudar.
   */
  async function updateEmployeesBulk(
    updates: {
      id: string
      name: string
      badge_code?: string
      department?: string
      role?: string
      shift_group?: string
      shift_label?: string
      employment_type?: string
    }[],
  ) {
    const { error: err } = await supabase.from('employees').upsert(updates, { onConflict: 'id' })
    if (!err) await reload()
    return err
  }

  return {
    employees,
    loading,
    error,
    reload,
    createEmployee,
    updateEmployee,
    setActive,
    importEmployees,
    updateEmployeesBulk,
  }
}
