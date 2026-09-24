import type { Employee } from '../types'
import type { OndaRotas } from './expedicaoTxt'

export interface SorteioRow {
  vaga: number
  colaborador: string
  employeeId: string
  rotasPorOnda: Record<number, string>
}

export interface RotaNaoPreenchida {
  onda: number
  rota: string
}

export interface SorteioResultado {
  rows: SorteioRow[]
  rotasNaoPreenchidas: RotaNaoPreenchida[]
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
 * elegível, o excedente fica em "rotasNaoPreenchidas" em vez de duplicar
 * alguém de forma irreal.
 */
export function sortearExpedicao(ondas: OndaRotas[], pool: Employee[]): SorteioResultado {
  const porColaborador = new Map<string, SorteioRow>()
  const rotasNaoPreenchidas: RotaNaoPreenchida[] = []

  for (const { onda, rotas } of ondas) {
    const shuffled = shuffle(pool)

    rotas.forEach((rota, index) => {
      const employee = shuffled[index]
      if (!employee) {
        rotasNaoPreenchidas.push({ onda, rota })
        return
      }

      const row = porColaborador.get(employee.id) ?? {
        vaga: 0,
        colaborador: employee.name,
        employeeId: employee.id,
        rotasPorOnda: {},
      }
      row.rotasPorOnda[onda] = rota
      porColaborador.set(employee.id, row)
    })
  }

  const rows = Array.from(porColaborador.values())
    .sort((a, b) => a.colaborador.localeCompare(b.colaborador))
    .map((row, index) => ({ ...row, vaga: index + 1 }))

  return { rows, rotasNaoPreenchidas }
}
