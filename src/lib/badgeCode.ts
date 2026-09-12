/**
 * O crachá/LMS do colaborador é lido como um código no formato "{12345}".
 * Extrai apenas o número que identifica o colaborador. Se o texto não tiver
 * chaves (ex.: digitação manual do número), usa o próprio texto trimado.
 */
export function extractBadgeCode(rawScan: string): string | null {
  const trimmed = rawScan.trim()
  if (!trimmed) return null

  const match = trimmed.match(/\{(\d+)\}/)
  if (match) return match[1]

  const digitsOnly = trimmed.replace(/\D/g, '')
  return digitsOnly.length > 0 ? digitsOnly : null
}
