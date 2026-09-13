import Papa from 'papaparse'
import type { Employee } from '../types'

export type LmsUpdateStatus = 'ok' | 'unchanged' | 'conflict' | 'not_found' | 'ambiguous' | 'duplicate_lms'

export interface ParsedLmsRow {
  row: number
  name: string
  lms: string | null
  employee: Employee | null
  status: LmsUpdateStatus
  message: string
}

const HEADER_ALIASES: Record<string, 'name' | 'lms'> = {
  nome: 'name',
  name: 'name',
  lms: 'lms',
  cracha: 'lms',
  'crachá': 'lms',
  matricula: 'lms',
  'matrícula': 'lms',
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

export function parseLmsUpdateCsv(csvText: string, employees: Employee[]): ParsedLmsRow[] {
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

  const lmsInUse = new Map<string, Employee>()
  for (const emp of employees) {
    if (emp.badge_code) lmsInUse.set(emp.badge_code, emp)
  }
  const lmsSeenInFile = new Set<string>()
  const employeeIdsSeenInFile = new Set<string>()

  return parsed.data.map((raw, index) => {
    const rowNumber = index + 2

    let name = ''
    let lms: string | null = null
    for (const [header, value] of Object.entries(raw)) {
      const field = HEADER_ALIASES[normalizeHeader(header)]
      if (!field || value == null) continue
      const trimmed = String(value).trim()
      if (!trimmed) continue
      if (field === 'name') name = trimmed
      else lms = trimmed.replace(/\D/g, '') || null
    }

    if (!name) {
      return { row: rowNumber, name, lms, employee: null, status: 'not_found', message: 'Sem nome — linha ignorada.' }
    }
    if (!lms) {
      return { row: rowNumber, name, lms, employee: null, status: 'not_found', message: 'Sem LMS — linha ignorada.' }
    }

    const matches = byNormalizedName.get(normalizeName(name)) ?? []
    if (matches.length === 0) {
      return { row: rowNumber, name, lms, employee: null, status: 'not_found', message: 'Colaborador não encontrado no cadastro.' }
    }
    if (matches.length > 1) {
      return {
        row: rowNumber,
        name,
        lms,
        employee: null,
        status: 'ambiguous',
        message: `${matches.length} colaboradores com esse nome — atualize manualmente.`,
      }
    }

    const employee = matches[0]

    if (employeeIdsSeenInFile.has(employee.id)) {
      return {
        row: rowNumber,
        name,
        lms,
        employee,
        status: 'ambiguous',
        message: 'Esse colaborador já aparece em outra linha deste arquivo.',
      }
    }
    employeeIdsSeenInFile.add(employee.id)

    const holder = lmsInUse.get(lms)
    if (holder && holder.id !== employee.id) {
      return {
        row: rowNumber,
        name,
        lms,
        employee,
        status: 'duplicate_lms',
        message: `LMS ${lms} já pertence a ${holder.name}.`,
      }
    }
    if (lmsSeenInFile.has(lms)) {
      return { row: rowNumber, name, lms, employee, status: 'duplicate_lms', message: `LMS ${lms} duplicado no arquivo.` }
    }
    lmsSeenInFile.add(lms)

    if (employee.badge_code === lms) {
      return { row: rowNumber, name, lms, employee, status: 'unchanged', message: 'Já estava com esse LMS.' }
    }
    if (employee.badge_code) {
      return {
        row: rowNumber,
        name,
        lms,
        employee,
        status: 'conflict',
        message: `Vai trocar o LMS de ${employee.badge_code} para ${lms}.`,
      }
    }

    return { row: rowNumber, name, lms, employee, status: 'ok', message: 'Pronto para atualizar.' }
  })
}

export function lmsUpdateCsvTemplate(): string {
  return Papa.unparse({
    fields: ['nome', 'lms'],
    data: [['Maria da Silva', '12345']],
  })
}
