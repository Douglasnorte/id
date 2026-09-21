import Papa from 'papaparse'
import type { Employee } from '../types'

export type LmsUpdateStatus = 'ok' | 'unchanged' | 'conflict' | 'not_found' | 'ambiguous' | 'duplicate_lms'

export interface EmployeeUpdateFields {
  badge_code?: string
  department?: string
  role?: string
  shift_group?: string
  shift_label?: string
}

export interface ParsedLmsRow {
  row: number
  name: string
  lms: string | null
  changes: EmployeeUpdateFields
  employee: Employee | null
  status: LmsUpdateStatus
  message: string
}

type Field = 'name' | keyof EmployeeUpdateFields
type UpdatableField = keyof EmployeeUpdateFields

const HEADER_ALIASES: Record<string, Field> = {
  nome: 'name',
  name: 'name',
  lms: 'badge_code',
  cracha: 'badge_code',
  'crachá': 'badge_code',
  matricula: 'badge_code',
  'matrícula': 'badge_code',
  departamento: 'department',
  setor: 'department',
  operacao: 'department',
  'operação': 'department',
  cargo: 'role',
  'função': 'role',
  funcao: 'role',
  turno: 'shift_group',
  grupo: 'shift_group',
  escala: 'shift_label',
  'descricao escala': 'shift_label',
  'descrição escala': 'shift_label',
  horario: 'shift_label',
  'horário': 'shift_label',
}

const FIELD_LABEL: Record<UpdatableField, string> = {
  badge_code: 'LMS',
  department: 'Departamento',
  role: 'Cargo',
  shift_group: 'Turno',
  shift_label: 'Escala',
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
    const fields: Partial<Record<UpdatableField, string>> = {}
    for (const [header, value] of Object.entries(raw)) {
      const field = HEADER_ALIASES[normalizeHeader(header)]
      if (!field || value == null) continue
      const trimmed = String(value).trim()
      if (!trimmed) continue
      if (field === 'name') name = trimmed
      else if (field === 'badge_code') fields.badge_code = trimmed.replace(/\D/g, '') || undefined
      else fields[field] = trimmed
    }
    const lms = fields.badge_code ?? null

    if (!name) {
      return { row: rowNumber, name, lms, changes: {}, employee: null, status: 'not_found', message: 'Sem nome — linha ignorada.' }
    }
    if (Object.keys(fields).length === 0) {
      return { row: rowNumber, name, lms, changes: {}, employee: null, status: 'not_found', message: 'Sem nada para atualizar nessa linha.' }
    }

    const matches = byNormalizedName.get(normalizeName(name)) ?? []
    if (matches.length === 0) {
      return { row: rowNumber, name, lms, changes: {}, employee: null, status: 'not_found', message: 'Colaborador não encontrado no cadastro.' }
    }
    if (matches.length > 1) {
      return {
        row: rowNumber,
        name,
        lms,
        changes: {},
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
        changes: {},
        employee,
        status: 'ambiguous',
        message: 'Esse colaborador já aparece em outra linha deste arquivo.',
      }
    }
    employeeIdsSeenInFile.add(employee.id)

    if (lms) {
      const holder = lmsInUse.get(lms)
      if (holder && holder.id !== employee.id) {
        return {
          row: rowNumber,
          name,
          lms,
          changes: {},
          employee,
          status: 'duplicate_lms',
          message: `LMS ${lms} já pertence a ${holder.name}.`,
        }
      }
      if (lmsSeenInFile.has(lms)) {
        return { row: rowNumber, name, lms, changes: {}, employee, status: 'duplicate_lms', message: `LMS ${lms} duplicado no arquivo.` }
      }
      lmsSeenInFile.add(lms)
    }

    const current: Record<UpdatableField, string | null> = {
      badge_code: employee.badge_code,
      department: employee.department,
      role: employee.role,
      shift_group: employee.shift_group,
      shift_label: employee.shift_label,
    }

    const changes: EmployeeUpdateFields = {}
    const diffLines: string[] = []
    let hasNewLms = false

    for (const [field, newValue] of Object.entries(fields) as [UpdatableField, string][]) {
      if (newValue === current[field]) continue
      changes[field] = newValue
      diffLines.push(`${FIELD_LABEL[field]}: ${current[field] ?? '—'} → ${newValue}`)
      if (field === 'badge_code' && current.badge_code) hasNewLms = true
    }

    if (diffLines.length === 0) {
      return { row: rowNumber, name, lms, changes: {}, employee, status: 'unchanged', message: 'Já estava tudo certo.' }
    }

    return {
      row: rowNumber,
      name,
      lms,
      changes,
      employee,
      status: hasNewLms ? 'conflict' : 'ok',
      message: diffLines.join('; '),
    }
  })
}

export function lmsUpdateCsvTemplate(): string {
  return Papa.unparse({
    fields: ['nome', 'lms', 'departamento', 'cargo', 'turno', 'escala'],
    data: [['Maria da Silva', '12345', 'SVC AM', 'Operadora', 'A', '5x2 - 01:30 as 10:48']],
  })
}
