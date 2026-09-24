import type { Employee } from '../types'
import type { OndaRotas } from './expedicaoTxt'

export interface Assignment {
  vaga: number | null
  onda: number
  rota: string
  colaborador: string
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Sorteia um colaborador por rota. Quando a linha traz uma vaga explícita, a
 * mesma pessoa cobre todas as ondas em que aquela vaga aparece (é a mesma
 * posição física o dia todo, só muda a rota). Linhas sem vaga caem no
 * sorteio antigo: independente por onda, nunca repete ninguém dentro da
 * mesma onda, mas pode repetir entre ondas diferentes. Quando falta gente
 * pra alguma vaga/rota, o colaborador fica vazio (editável na tela).
 */
export function sortearExpedicao(ondas: OndaRotas[], pool: Employee[]): Assignment[] {
  type Item = { vaga: number | null; onda: number; rota: string }
  const items: Item[] = []
  for (const { onda, rotas } of ondas) {
    for (const r of rotas) items.push({ vaga: r.vaga, onda, rota: r.rota })
  }

  const vagasUnicas = Array.from(new Set(items.filter((i) => i.vaga != null).map((i) => i.vaga as number))).sort(
    (a, b) => a - b,
  )
  const shuffledVagas = shuffle(pool)
  const colaboradorPorVaga = new Map<number, string>()
  vagasUnicas.forEach((vaga, index) => colaboradorPorVaga.set(vaga, shuffledVagas[index]?.name ?? ''))

  const shuffledPorOnda = new Map<number, Employee[]>()
  const indicePorOnda = new Map<number, number>()

  return items.map((item) => {
    if (item.vaga != null) {
      return {
        vaga: item.vaga,
        onda: item.onda,
        rota: item.rota,
        colaborador: colaboradorPorVaga.get(item.vaga) ?? '',
      }
    }
    if (!shuffledPorOnda.has(item.onda)) shuffledPorOnda.set(item.onda, shuffle(pool))
    const index = indicePorOnda.get(item.onda) ?? 0
    indicePorOnda.set(item.onda, index + 1)
    const colaborador = shuffledPorOnda.get(item.onda)![index]?.name ?? ''
    return { vaga: null, onda: item.onda, rota: item.rota, colaborador }
  })
}
