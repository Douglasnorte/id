import Papa from 'papaparse'
import type { EmployeeInput } from '../hooks/useEmployees'
import type { Employee } from '../types'

export interface ParsedRow {
  row: number
  input: EmployeeInput | null
  error: string | null
}

const HEADER_ALIASES: Record<string, keyof EmployeeInput> = {
  lms: 'badge_code',
  cracha: 'badge_code',
  'crachá': 'badge_code',
  matricula: 'badge_code',
  'matrícula': 'badge_code',
  badge: 'badge_code',
  nome: 'name',
  name: 'name',
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
  // descrição por compatibilidade com arquivos antigos — ver resolveEscalaAlias.
  escala: 'shift_label',
  'descricao escala': 'shift_label',
  'descrição escala': 'shift_label',
  horario: 'shift_label',
  'horário': 'shift_label',
  tipo: 'employment_type',
  'tipo de contrato': 'employment_type',
  contratacao: 'employment_type',
  'contratação': 'employment_type',
  observacoes: 'notes',
  'observações': 'notes',
  obs: 'notes',
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Planilhas de RH costumam ter "Escala" (o grupo/turno, ex. "2 TURNO/ SD D")
 * e "Descrição Escala" (o horário por extenso) como colunas separadas — nesse
 * caso "escala" sozinho quer dizer o grupo (shift_group), não a descrição.
 * Sem uma coluna de descrição junto, mantém o sentido antigo (shift_label).
 */
export function resolveHeaderAliases(headers: string[]): Record<string, keyof EmployeeInput> {
  const normalized = headers.map(normalizeHeader)
  const hasDescricao = normalized.some((h) => HEADER_ALIASES[h] === 'shift_label' && h !== 'escala')
  const hasTurno = normalized.some((h) => HEADER_ALIASES[h] === 'shift_group')
  if (!hasDescricao || hasTurno) return HEADER_ALIASES
  return { ...HEADER_ALIASES, escala: 'shift_group' }
}

export function csvTemplate(): string {
  return Papa.unparse({
    fields: ['lms', 'nome', 'departamento', 'cargo', 'escala', 'descricao escala', 'tipo', 'observacoes'],
    data: [['12345', 'Maria da Silva', 'SVC AM', 'Operadora', 'A', '5x2 - 01:30 as 10:48', 'Efetivo', '']],
  })
}

export function parseEmployeesCsv(csvText: string, existing: Employee[]): ParsedRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeHeader(h),
  })

  const existingCodes = new Set(existing.map((e) => e.badge_code).filter((c): c is string => !!c))
  const seenCodesInFile = new Set<string>()
  const aliases = resolveHeaderAliases(parsed.meta.fields ?? [])

  return parsed.data.map((raw, index) => {
    const rowNumber = index + 2 // +1 for header, +1 for 1-based

    const input: Partial<EmployeeInput> = {}
    for (const [header, value] of Object.entries(raw)) {
      const field = aliases[normalizeHeader(header)]
      if (!field || value == null) continue
      const trimmed = String(value).trim()
      if (!trimmed) continue
      if (field === 'badge_code') {
        input.badge_code = trimmed.replace(/\D/g, '') || null
      } else {
        input[field] = trimmed
      }
    }

    if (!input.name) {
      return { row: rowNumber, input: null, error: 'Sem nome — linha ignorada.' }
    }

    if (input.badge_code) {
      if (existingCodes.has(input.badge_code)) {
        return { row: rowNumber, input: null, error: `LMS ${input.badge_code} já cadastrado.` }
      }
      if (seenCodesInFile.has(input.badge_code)) {
        return { row: rowNumber, input: null, error: `LMS ${input.badge_code} duplicado no arquivo.` }
      }
      seenCodesInFile.add(input.badge_code)
    }

    return { row: rowNumber, input: input as EmployeeInput, error: null }
  })
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['﻿' + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
