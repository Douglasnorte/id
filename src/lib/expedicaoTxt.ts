export interface RotaEntry {
  vaga: number | null
  rota: string
  sacas: number | null
}

export interface OndaRotas {
  onda: number
  rotas: RotaEntry[]
}

/**
 * Aceita três formatos, linha a linha:
 *  1) Colado direto de uma planilha com vaga (3 ou 4 colunas: vaga, onda,
 *     rota, sacas) — ex.: "1\t1\tA1_PM1\t50". A coluna de sacas é opcional
 *     e por linha: quando presente, mostra a quantidade na tabela final;
 *     quando ausente, a célula de sacas fica em branco. Repetir a mesma
 *     vaga em ondas diferentes mantém a mesma pessoa sorteada nessa posição
 *     em todas as ondas em que ela aparece.
 *  2) Colado sem vaga (2 colunas: onda, rota) — ex.: "1\tA1_PM1". A vaga sai
 *     numerada automaticamente na tabela final, e o sorteio é independente
 *     por onda (a mesma pessoa pode repetir em ondas diferentes). Esse
 *     formato não tem coluna de sacas.
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
        let sacas: number | null = null
        if (columns.length >= 4) {
          const parsedSacas = Number(columns[3].replace(/\D/g, ''))
          if (!Number.isNaN(parsedSacas) && parsedSacas > 0) sacas = parsedSacas
        }
        if (!ondas.has(ondaNum)) ondas.set(ondaNum, [])
        ondas.get(ondaNum)!.push({ vaga, rota, sacas })
        continue
      }
    }

    if (columns.length >= 2) {
      const ondaNum = Number(columns[0].replace(/\D/g, ''))
      const rota = columns[1]
      if (!Number.isNaN(ondaNum) && ondaNum > 0 && rota) {
        if (!ondas.has(ondaNum)) ondas.set(ondaNum, [])
        ondas.get(ondaNum)!.push({ vaga: null, rota, sacas: null })
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
    ondas.get(current)!.push({ vaga: null, rota: line, sacas: null })
  }

  return Array.from(ondas.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([onda, rotas]) => ({ onda, rotas }))
}

export function expedicaoTxtTemplate(): string {
  return ['1\t1\tA1_PM1\t50', '1\t2\tA2_PM1', '2\t1\tB1_PM1\t30', '2\t2\tB2_PM1', '3\t1\tC1_PM1'].join('\n')
}
