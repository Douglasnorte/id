import Papa from 'papaparse'
import type { ShiftCalendarInput } from '../hooks/useShiftCalendar'

export interface ParsedCalendarRow {
  row: number
  input: ShiftCalendarInput | null
  error: string | null
}

const HEADER_ALIASES: Record<string, string> = {
  data: 'work_date',
  date: 'work_date',
  departamento: 'department',
  setor: 'department',
  operacao: 'department',
  'operação': 'department',
  escala: 'shift_group',
  turno: 'shift_group',
  grupo: 'shift_group',
  dsr: 'is_dsr',
  folga: 'is_dsr',
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  // AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  // DD/MM/AAAA ou DD-MM-AAAA
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function parseBoolean(raw: string): boolean {
  const v = raw.trim().toLowerCase()
  return v === 'sim' || v === 'true' || v === '1' || v === 'dsr' || v === 'x'
}

export function shiftCalendarCsvTemplate(): string {
  return Papa.unparse({
    fields: ['data', 'departamento', 'escala', 'dsr'],
    data: [
      ['31/08/2026', 'SVC AM', 'A', 'sim'],
      ['31/08/2026', 'SVC AM', 'B', 'nao'],
    ],
  })
}

export function parseShiftCalendarCsv(csvText: string): ParsedCalendarRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeHeader(h),
  })

  return parsed.data.map((raw, index) => {
    const rowNumber = index + 2

    let work_date = ''
    let department = ''
    let shift_group = ''
    let is_dsr = false

    for (const [header, value] of Object.entries(raw)) {
      const field = HEADER_ALIASES[normalizeHeader(header)]
      if (!field || value == null) continue
      const trimmed = String(value).trim()
      if (!trimmed) continue

      if (field === 'work_date') {
        const parsedDate = parseDate(trimmed)
        if (!parsedDate) return { row: rowNumber, input: null, error: `Data inválida: "${trimmed}"` }
        work_date = parsedDate
      } else if (field === 'department') {
        department = trimmed
      } else if (field === 'shift_group') {
        shift_group = trimmed
      } else if (field === 'is_dsr') {
        is_dsr = parseBoolean(trimmed)
      }
    }

    if (!work_date) return { row: rowNumber, input: null, error: 'Sem data — linha ignorada.' }
    if (!department) return { row: rowNumber, input: null, error: 'Sem departamento — linha ignorada.' }
    if (!shift_group) return { row: rowNumber, input: null, error: 'Sem escala — linha ignorada.' }

    return { row: rowNumber, input: { work_date, department, shift_group, is_dsr }, error: null }
  })
}
