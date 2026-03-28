import ExcelJS from 'exceljs'

const EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function buildWorkbookBuffer(
  sheetName: string,
  rows: Array<Record<string, string | number>>
) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  const headers = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        set.add(key)
      }

      return set
    }, new Set<string>())
  )

  if (headers.length > 0) {
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 4, 18),
    }))

    for (const row of rows) {
      worksheet.addRow(row)
    }

    worksheet.getRow(1).font = { bold: true }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export function createExcelHeaders(fileName: string) {
  return {
    'Content-Type': EXCEL_CONTENT_TYPE,
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Cache-Control': 'no-store',
  }
}