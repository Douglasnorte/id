export interface OndaRotas {
  onda: number
  rotas: string[]
}

/**
 * Formato esperado (uma seção por onda, uma rota por linha):
 *
 * ONDA 1
 * A1_PM1
 * A2_PM1
 *
 * ONDA 2
 * B1_PM1
 */
export function parseExpedicaoTxt(text: string): OndaRotas[] {
  const ondas = new Map<number, string[]>()
  let current: number | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

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
  return [
    'ONDA 1',
    'A1_PM1',
    'A2_PM1',
    'B1_PM1',
    '',
    'ONDA 2',
    'A1_PM1',
    'A2_PM1',
    'C1_PM1',
    '',
    'ONDA 3',
    'I1_PM1',
    'I2_PM1',
    'K1_PM1',
    '',
  ].join('\n')
}
