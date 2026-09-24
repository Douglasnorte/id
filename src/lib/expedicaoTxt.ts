export interface OndaRotas {
  onda: number
  rotas: string[]
}

/**
 * Aceita dois formatos, linha a linha:
 *  1) Colado direto de uma planilha (2 colunas: onda, rota), separado por
 *     tab, ponto-e-vírgula ou vírgula — ex.: "1\tA1_PM1".
 *  2) Seções por onda, uma rota por linha:
 *       ONDA 1
 *       A1_PM1
 *       A2_PM1
 */
export function parseExpedicaoTxt(text: string): OndaRotas[] {
  const ondas = new Map<number, string[]>()
  let current: number | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const columns = line.split(/\t|;|,/).map((c) => c.trim()).filter(Boolean)
    if (columns.length >= 2) {
      const ondaNum = Number(columns[0].replace(/\D/g, ''))
      const rota = columns[1]
      if (!Number.isNaN(ondaNum) && ondaNum > 0 && rota) {
        if (!ondas.has(ondaNum)) ondas.set(ondaNum, [])
        ondas.get(ondaNum)!.push(rota)
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
    ondas.get(current)!.push(line)
  }

  return Array.from(ondas.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([onda, rotas]) => ({ onda, rotas }))
}

export function expedicaoTxtTemplate(): string {
  return ['1\tA1_PM1', '1\tA2_PM1', '1\tB1_PM1', '2\tA1_PM1', '2\tA2_PM1', '2\tC1_PM1'].join('\n')
}
