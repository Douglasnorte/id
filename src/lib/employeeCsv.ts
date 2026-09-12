import Papa from 'papaparse'
import type { EmployeeInput } from '../hooks/useEmployees'
import type { Employee } from '../types'

export interface ParsedRow {
  row: number
  input: EmployeeInput | null
  error: string | null
}

const HEADER_ALIASES: Record<string, keyof EmployeeInput> = {
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
  contratacao: 'role',
  'contratação': 'role',
  turno: 'shift_group',
  grupo: 'shift_group',
  escala: 'shift_label',
  'descricao escala': 'shift_label',
  'descrição escala': 'shift_label',
  horario: 'shift_label',
  'horário': 'shift_label',
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

export function csvTemplate(): string {
  return Papa.unparse({
    fields: ['cracha', 'nome', 'departamento', 'cargo', 'turno', 'escala', 'observacoes'],
    data: [['12345', 'Maria da Silva', 'SVC AM', 'Operadora', 'A', '5x2 - 01:30 as 10:48', '']],
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

  return parsed.data.map((raw, index) => {
    const rowNumber = index + 2 // +1 for header, +1 for 1-based

    const input: Partial<EmployeeInput> = {}
    for (const [header, value] of Object.entries(raw)) {
      const field = HEADER_ALIASES[normalizeHeader(header)]
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
        return { row: rowNumber, input: null, error: `Crachá ${input.badge_code} já cadastrado.` }
      }
      if (seenCodesInFile.has(input.badge_code)) {
        return { row: rowNumber, input: null, error: `Crachá ${input.badge_code} duplicado no arquivo.` }
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
