import Papa from 'papaparse'
import type { Employee } from '../types'

export type DeleteRowStatus = 'ok' | 'not_found' | 'ambiguous' | 'duplicate_in_file'

export interface ParsedDeleteRow {
  row: number
  name: string
  employee: Employee | null
  status: DeleteRowStatus
  message: string
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

const NAME_HEADERS = new Set(['nome', 'name'])

export function parseDeleteEmployeesCsv(csvText: string, employees: Employee[]): ParsedDeleteRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeHeader(h),
  })

  const byNormalizedName = new Map<string, Employee[]>()
  for (const emp of employees) {
    const key = normalizeName(emp.name)
    const list = byNormalizedName.get(key) ?? []
    list.push(emp)
    byNormalizedName.set(key, list)
  }

  const employeeIdsSeenInFile = new Set<string>()

  return parsed.data.map((raw, index) => {
    const rowNumber = index + 2

    let name = ''
    for (const [header, value] of Object.entries(raw)) {
      if (!NAME_HEADERS.has(normalizeHeader(header)) || value == null) continue
      const trimmed = String(value).trim()
      if (trimmed) name = trimmed
    }

    if (!name) {
      return { row: rowNumber, name, employee: null, status: 'not_found', message: 'Sem nome — linha ignorada.' }
    }

    const matches = byNormalizedName.get(normalizeName(name)) ?? []
    if (matches.length === 0) {
      return { row: rowNumber, name, employee: null, status: 'not_found', message: 'Colaborador não encontrado no cadastro.' }
    }
    if (matches.length > 1) {
      return {
        row: rowNumber,
        name,
        employee: null,
        status: 'ambiguous',
        message: `${matches.length} colaboradores com esse nome — exclua manualmente.`,
      }
    }

    const employee = matches[0]
    if (employeeIdsSeenInFile.has(employee.id)) {
      return { row: rowNumber, name, employee, status: 'duplicate_in_file', message: 'Esse colaborador já aparece em outra linha deste arquivo.' }
    }
    employeeIdsSeenInFile.add(employee.id)

    return { row: rowNumber, name, employee, status: 'ok', message: 'Pronto para excluir.' }
  })
}

export function deleteEmployeesCsvTemplate(): string {
  return Papa.unparse({
    fields: ['nome'],
    data: [['Maria da Silva']],
  })
}
