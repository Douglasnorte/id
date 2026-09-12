import { useState } from 'react'
import EmployeeForm, { EmployeeFormValues } from './EmployeeForm'
import EmployeeList from './EmployeeList'
import ImportCsv from './ImportCsv'
import type { EmployeeInput } from '../../hooks/useEmployees'
import type { Employee } from '../../types'

interface Props {
  employees: Employee[]
  createEmployee: (input: EmployeeInput) => Promise<{ message: string } | null>
  updateEmployee: (
    id: string,
    changes: Partial<
      Pick<Employee, 'name' | 'badge_code' | 'department' | 'role' | 'shift_group' | 'shift_label' | 'notes' | 'active'>
    >,
  ) => Promise<{ message: string } | null>
  setActive: (id: string, active: boolean) => Promise<{ message: string } | null>
  importEmployees: (rows: EmployeeInput[]) => Promise<{ message: string } | null>
}

type Panel = 'none' | 'form' | 'import'

export default function EmployeesTab({ employees, createEmployee, updateEmployee, setActive, importEmployees }: Props) {
  const [panel, setPanel] = useState<Panel>('none')
  const [editing, setEditing] = useState<Employee | null>(null)

  function openNew() {
    setEditing(null)
    setPanel('form')
  }

  function openEdit(employee: Employee) {
    setEditing(employee)
    setPanel('form')
  }

  async function handleSubmit(values: EmployeeFormValues): Promise<string | void> {
    const payload = {
      badge_code: values.badge_code || null,
      name: values.name,
      department: values.department || null,
      role: values.role || null,
      shift_group: values.shift_group || null,
      shift_label: values.shift_label || null,
      notes: values.notes || null,
    }

    const err = editing ? await updateEmployee(editing.id, payload) : await createEmployee(payload)
    if (err) return err.message
    setPanel('none')
    setEditing(null)
  }

  async function handleImport(rows: EmployeeInput[]): Promise<string | void> {
    const err = await importEmployees(rows)
    if (err) return err.message
  }

  async function handleToggleActive(employee: Employee) {
    await setActive(employee.id, !employee.active)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Colaboradores</h1>
          <p className="text-sm text-slate-500">Cadastre colaboradores e gerencie quem está ativo.</p>
        </div>
        {panel === 'none' && (
          <div className="flex gap-2">
            <button
              onClick={() => setPanel('import')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar CSV
            </button>
            <button
              onClick={openNew}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              + Novo colaborador
            </button>
          </div>
        )}
      </div>

      {panel === 'form' && (
        <EmployeeForm
          initial={editing}
          onCancel={() => {
            setPanel('none')
            setEditing(null)
          }}
          onSubmit={handleSubmit}
        />
      )}

      {panel === 'import' && (
        <ImportCsv employees={employees} onImport={handleImport} onClose={() => setPanel('none')} />
      )}

      <EmployeeList employees={employees} onEdit={openEdit} onToggleActive={handleToggleActive} />
    </div>
  )
}
