export interface RotaEntry {
  vaga: number | null
  rota: string
}

export interface OndaRotas {
  onda: number
  rotas: RotaEntry[]
}

/**
 * Aceita três formatos, linha a linha:
 *  1) Colado direto de uma planilha com vaga (3 colunas: vaga, onda, rota),
 *     separado por tab, ponto-e-vírgula ou vírgula — ex.: "1\t1\tA1_PM1".
 *     Repetir a mesma vaga em ondas diferentes mantém a mesma pessoa
 *     sorteada nessa posição em todas as ondas em que ela aparece.
 *  2) Colado sem vaga (2 colunas: onda, rota) — ex.: "1\tA1_PM1". A vaga sai
 *     numerada automaticamente na tabela final, e o sorteio é independente
 *     por onda (a mesma pessoa pode repetir em ondas diferentes).
 *  3) Seções por onda, uma rota por linha:
 *       ONDA 1
 *       A1_PM1
 *       A2_PM1
 */
export function parseExpedicaoTxt(text: string): OndaRotas[] {
  const ondas = new Map<number, RotaEntry[]>()
  let current: number | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const columns = line.split(/\t|;|,/).map((c) => c.trim()).filter(Boolean)

    if (columns.length >= 3) {
      const vaga = Number(columns[0].replace(/\D/g, ''))
      const ondaNum = Number(columns[1].replace(/\D/g, ''))
      const rota = columns[2]
      if (!Number.isNaN(vaga) && vaga > 0 && !Number.isNaN(ondaNum) && ondaNum > 0 && rota) {
        if (!ondas.has(ondaNum)) ondas.set(ondaNum, [])
        ondas.get(ondaNum)!.push({ vaga, rota })
        continue
      }
    }

    if (columns.length >= 2) {
      const ondaNum = Number(columns[0].replace(/\D/g, ''))
      const rota = columns[1]
      if (!Number.isNaN(ondaNum) && ondaNum > 0 && rota) {
        if (!ondas.has(ondaNum)) ondas.set(ondaNum, [])
        ondas.get(ondaNum)!.push({ vaga: null, rota })
        continue
      }
    }

    const ondaMatch = line.match(/^onda\s*(\d+)/i)
    if (ondaMatch) {
      current = Number(ondaMatch[1])
      if (!ondas.has(current)) ondas.set(current, [])
      continue
    }

    if (current == null) continue
    ondas.get(current)!.push({ vaga: null, rota: line })
  }

  return Array.from(ondas.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([onda, rotas]) => ({ onda, rotas }))
}

export function expedicaoTxtTemplate(): string {
  return ['1\t1\tA1_PM1', '1\t2\tA2_PM1', '2\t1\tB1_PM1', '2\t2\tB2_PM1', '3\t1\tC1_PM1'].join('\n')
}
