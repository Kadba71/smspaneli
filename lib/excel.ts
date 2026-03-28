import * as XLSX from 'xlsx'

const EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function buildWorkbookBuffer(sheetName: string, rows: Array<Record<string, string | number>>) {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  })
}

export function createExcelHeaders(fileName: string) {
  return {
    'Content-Type': EXCEL_CONTENT_TYPE,
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Cache-Control': 'no-store',
  }
}