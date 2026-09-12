import { useMemo, useState } from 'react'
import type { Employee } from '../../types'

interface Props {
  employees: Employee[]
  onEdit: (employee: Employee) => void
  onToggleActive: (employee: Employee) => void
}

type Filter = 'all' | 'active' | 'inactive'

export default function EmployeeList({ employees, onEdit, onToggleActive }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('active')

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter((e) => {
      if (filter === 'active' && !e.active) return false
      if (filter === 'inactive' && e.active) return false
      if (!term) return true
      return (
        e.name.toLowerCase().includes(term) ||
        (e.badge_code ?? '').includes(term) ||
        (e.department ?? '').toLowerCase().includes(term)
      )
    })
  }, [employees, search, filter])

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Colaboradores cadastrados</h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, crachá ou setor"
            className="input max-w-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-2">Crachá</th>
              <th className="pb-2">Nome</th>
              <th className="pb-2">Departamento</th>
              <th className="pb-2">Cargo</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((employee) => (
              <tr key={employee.id}>
                <td className="py-2 font-mono text-slate-600">
                  {employee.badge_code ?? <span className="rounded bg-amber-100 px-1.5 py-0.5 font-sans text-xs text-amber-700">Pendente</span>}
                </td>
                <td className="py-2 font-medium text-slate-800">{employee.name}</td>
                <td className="py-2 text-slate-500">{employee.department ?? '—'}</td>
                <td className="py-2 text-slate-500">{employee.role ?? '—'}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      employee.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {employee.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(employee)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onToggleActive(employee)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-slate-100 ${
                        employee.active ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {employee.active ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
