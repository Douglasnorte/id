import type { Assignment } from './expedicaoSorteio'

export interface SorteioRow {
  vaga: number
  colaborador: string
  rotasPorOnda: Record<number, string>
}

/** Agrupa as atribuições (vaga, onda, rota, colaborador) por colaborador —
 * é o formato usado na tela e no PDF (uma linha por pessoa, uma coluna por
 * onda). Usa a vaga explícita quando ela veio do texto colado; quando não
 * veio, numera automaticamente por ordem alfabética, preenchendo os números
 * que não foram usados pelas vagas explícitas. */
export function buildRows(assignments: Assignment[]): SorteioRow[] {
  const porColaborador = new Map<
    string,
    { vaga: number | null; colaborador: string; rotasPorOnda: Record<number, string> }
  >()

  for (const a of assignments) {
    const nome = a.colaborador.trim()
    if (!nome) continue
    const row = porColaborador.get(nome) ?? { vaga: null, colaborador: nome, rotasPorOnda: {} }
    if (row.vaga == null && a.vaga != null) row.vaga = a.vaga
    row.rotasPorOnda[a.onda] = a.rota
    porColaborador.set(nome, row)
  }

  const rows = Array.from(porColaborador.values())
  const vagasUsadas = new Set(rows.filter((r) => r.vaga != null).map((r) => r.vaga as number))
  let proximoAutoVaga = 1
  for (const row of rows.filter((r) => r.vaga == null).sort((a, b) => a.colaborador.localeCompare(b.colaborador))) {
    while (vagasUsadas.has(proximoAutoVaga)) proximoAutoVaga++
    row.vaga = proximoAutoVaga
    vagasUsadas.add(proximoAutoVaga)
  }

  return rows
    .sort((a, b) => (a.vaga as number) - (b.vaga as number))
    .map((row) => ({ vaga: row.vaga as number, colaborador: row.colaborador, rotasPorOnda: row.rotasPorOnda }))
}
