import type { Assignment } from './expedicaoSorteio'

export interface SorteioRow {
  vaga: number
  colaborador: string
  rotasPorOnda: Record<number, string>
}

/** Agrupa as atribuições (onda, rota, colaborador) por colaborador — é o
 * formato usado na tela e no PDF (uma linha por pessoa, uma coluna por onda). */
export function buildRows(assignments: Assignment[]): SorteioRow[] {
  const porColaborador = new Map<string, SorteioRow>()

  for (const a of assignments) {
    const nome = a.colaborador.trim()
    if (!nome) continue
    const row = porColaborador.get(nome) ?? { vaga: 0, colaborador: nome, rotasPorOnda: {} }
    row.rotasPorOnda[a.onda] = a.rota
    porColaborador.set(nome, row)
  }

  return Array.from(porColaborador.values())
    .sort((a, b) => a.colaborador.localeCompare(b.colaborador))
    .map((row, index) => ({ ...row, vaga: index + 1 }))
}
