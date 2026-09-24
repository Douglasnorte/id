import type { Employee } from '../types'
import type { OndaRotas } from './expedicaoTxt'

export interface Assignment {
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
 * Sorteia, para cada onda, um colaborador distinto por rota — nunca repete
 * ninguém dentro da mesma onda (fisicamente não dá pra fazer duas rotas na
 * mesma leva ao mesmo tempo). O mesmo colaborador pode aparecer em ondas
 * diferentes normalmente. Quando uma onda tem mais rotas do que gente
 * elegível, o excedente fica com colaborador vazio (editável na tela).
 */
export function sortearExpedicao(ondas: OndaRotas[], pool: Employee[]): Assignment[] {
  const assignments: Assignment[] = []

  for (const { onda, rotas } of ondas) {
    const shuffled = shuffle(pool)
    rotas.forEach((rota, index) => {
      const employee = shuffled[index]
      assignments.push({ onda, rota, colaborador: employee?.name ?? '' })
    })
  }

  return assignments
}
