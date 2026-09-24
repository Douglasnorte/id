import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { OndaRotas } from './expedicaoTxt'
import type { SorteioRow } from './expedicaoSorteio'

export function gerarExpedicaoPdf(turno: 'AM' | 'PM', ondas: OndaRotas[], rows: SorteioRow[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  const titulo = `Tabela de Vagas e Rotas por Onda — Expedição ${turno}`
  const gaiolas = ondas.map((o) => `Onda ${o.onda} = ${o.rotas.length}`).join(' | ')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, 40, 40)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gaiolas por onda: ${gaiolas} — "-" = sem gaiola na onda`, 40, 56)

  const head = [['VAGA', 'COLABORADOR', ...ondas.map((o) => `ONDA ${o.onda}`)]]
  const body = rows.map((row) => [
    String(row.vaga),
    row.colaborador,
    ...ondas.map((o) => row.rotasPorOnda[o.onda] ?? '-'),
  ])

  autoTable(doc, {
    startY: 70,
    head,
    body,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { cellWidth: 220 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index >= 2) {
        data.cell.styles.halign = 'center'
      }
    },
  })

  const label = `expedicao-${turno.toLowerCase()}-${new Date().toLocaleDateString('sv-SE')}.pdf`
  doc.save(label)
}
