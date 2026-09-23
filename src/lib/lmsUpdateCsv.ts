import Papa from 'papaparse'
import type { Employee } from '../types'

export type LmsUpdateStatus = 'ok' | 'unchanged' | 'conflict' | 'not_found' | 'ambiguous' | 'duplicate_lms'

export interface EmployeeUpdateFields {
  badge_code?: string
  department?: string
  role?: string
  shift_group?: string
  shift_label?: string
  employment_type?: string
  active?: boolean
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

type StringUpdatableField = Exclude<keyof EmployeeUpdateFields, 'active'>
type Field = 'name' | 'active' | StringUpdatableField

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
  // "escala" sozinho (sem "descrição escala" junto) é tratado como a
  // descrição por compatibilidade com arquivos antigos — ver resolveHeaderAliases.
  escala: 'shift_label',
  'descricao escala': 'shift_label',
  'descrição escala': 'shift_label',
  horario: 'shift_label',
  'horário': 'shift_label',
  tipo: 'employment_type',
  'tipo de contrato': 'employment_type',
  status: 'active',
  ativo: 'active',
  situacao: 'active',
  'situação': 'active',
}

const FIELD_LABEL: Record<StringUpdatableField, string> = {
  badge_code: 'LMS',
  department: 'Departamento',
  role: 'Cargo',
  shift_group: 'Turno',
  shift_label: 'Escala',
  employment_type: 'Tipo',
}

const TRUE_VALUES = new Set(['ativo', 'sim', 'true', '1', 'yes'])
const FALSE_VALUES = new Set(['inativo', 'nao', 'não', 'false', '0', 'no'])

function parseActive(value: string): boolean | undefined {
  const v = value.trim().toLowerCase()
  if (TRUE_VALUES.has(v)) return true
  if (FALSE_VALUES.has(v)) return false
  return undefined
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/** Ver mesma lógica em employeeCsv.ts: "escala" quer dizer o grupo/turno
 * quando vem acompanhado de uma coluna de descrição separada. */
function resolveHeaderAliases(headers: string[]): Record<string, Field> {
  const normalized = headers.map(normalizeHeader)
  const hasDescricao = normalized.some((h) => HEADER_ALIASES[h] === 'shift_label' && h !== 'escala')
  const hasTurno = normalized.some((h) => HEADER_ALIASES[h] === 'shift_group')
  if (!hasDescricao || hasTurno) return HEADER_ALIASES
  return { ...HEADER_ALIASES, escala: 'shift_group' }
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
  const aliases = resolveHeaderAliases(parsed.meta.fields ?? [])

  return parsed.data.map((raw, index) => {
    const rowNumber = index + 2

    let name = ''
    let activeValue: boolean | undefined
    const fields: Partial<Record<StringUpdatableField, string>> = {}
    for (const [header, value] of Object.entries(raw)) {
      const field = aliases[normalizeHeader(header)]
      if (!field || value == null) continue
      const trimmed = String(value).trim()
      if (!trimmed) continue
      if (field === 'name') name = trimmed
      else if (field === 'active') activeValue = parseActive(trimmed)
      // "-" é um marcador explícito para limpar o campo (ex.: turno que não
      // deveria ter sido preenchido) — célula em branco de verdade continua
      // significando "não mexe nesse campo".
      else if (trimmed === '-') fields[field] = ''
      else if (field === 'badge_code') fields.badge_code = trimmed.replace(/\D/g, '') || undefined
      else fields[field] = trimmed
    }
    const lms = fields.badge_code ?? null

    if (!name) {
      return { row: rowNumber, name, lms, changes: {}, employee: null, status: 'not_found', message: 'Sem nome — linha ignorada.' }
    }
    if (Object.keys(fields).length === 0 && activeValue === undefined) {
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

    const current: Record<StringUpdatableField, string | null> = {
      badge_code: employee.badge_code,
      department: employee.department,
      role: employee.role,
      shift_group: employee.shift_group,
      shift_label: employee.shift_label,
      employment_type: employee.employment_type,
    }

    const changes: EmployeeUpdateFields = {}
    const diffLines: string[] = []
    let hasNewLms = false

    for (const [field, newValue] of Object.entries(fields) as [StringUpdatableField, string][]) {
      const currentValue = current[field] ?? ''
      if (newValue === currentValue) continue
      changes[field] = newValue
      diffLines.push(`${FIELD_LABEL[field]}: ${current[field] ?? '—'} → ${newValue || '(vazio)'}`)
      if (field === 'badge_code' && current.badge_code && newValue) hasNewLms = true
    }

    if (activeValue !== undefined && activeValue !== employee.active) {
      changes.active = activeValue
      diffLines.push(`Status: ${employee.active ? 'Ativo' : 'Inativo'} → ${activeValue ? 'Ativo' : 'Inativo'}`)
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
    fields: ['nome', 'lms', 'departamento', 'cargo', 'escala', 'descricao escala', 'tipo'],
    data: [
      ['Maria da Silva', '12345', 'SVC AM', 'Operadora', 'A', '5x2 - 01:30 as 10:48', 'Efetivo'],
      ['Joao Souza', '', '', '', '-', '', ''],
    ],
  })
}
