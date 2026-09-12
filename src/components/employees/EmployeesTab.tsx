import { useState } from 'react'
import EmployeeForm, { EmployeeFormValues } from './EmployeeForm'
import EmployeeList from './EmployeeList'
import type { Employee } from '../../types'

interface Props {
  employees: Employee[]
  createEmployee: (input: {
    badge_code: string
    name: string
    department?: string | null
    role?: string | null
    notes?: string | null
  }) => Promise<{ message: string } | null>
  updateEmployee: (
    id: string,
    changes: Partial<Pick<Employee, 'name' | 'badge_code' | 'department' | 'role' | 'notes' | 'active'>>,
  ) => Promise<{ message: string } | null>
  setActive: (id: string, active: boolean) => Promise<{ message: string } | null>
}

export default function EmployeesTab({ employees, createEmployee, updateEmployee, setActive }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(employee: Employee) {
    setEditing(employee)
    setShowForm(true)
  }

  async function handleSubmit(values: EmployeeFormValues): Promise<string | void> {
    const payload = {
      badge_code: values.badge_code,
      name: values.name,
      department: values.department || null,
      role: values.role || null,
      notes: values.notes || null,
    }

    const err = editing ? await updateEmployee(editing.id, payload) : await createEmployee(payload)
    if (err) return err.message
    setShowForm(false)
    setEditing(null)
  }

  async function handleToggleActive(employee: Employee) {
    await setActive(employee.id, !employee.active)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Colaboradores</h1>
          <p className="text-sm text-slate-500">Cadastre colaboradores e gerencie quem está ativo.</p>
        </div>
        {!showForm && (
          <button
            onClick={openNew}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Novo colaborador
          </button>
        )}
      </div>

      {showForm && (
        <EmployeeForm
          initial={editing}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSubmit={handleSubmit}
        />
      )}

      <EmployeeList employees={employees} onEdit={openEdit} onToggleActive={handleToggleActive} />
    </div>
  )
}
