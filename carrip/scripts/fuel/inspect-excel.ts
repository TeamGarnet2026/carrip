import { writeFileSync } from 'fs'
import * as XLSX from 'xlsx'
import { downloadWeeklyExcel } from '../../lib/fuel/download-enecho-weekly'

async function main() {
  const { buffer, url } = await downloadWeeklyExcel()
  writeFileSync('/tmp/260729-real.xlsx', buffer)
  console.log('saved', url, buffer.byteLength)

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  console.log('sheets', wb.SheetNames)

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
    }) as unknown[][]
    console.log('\n===', name, 'len', rows.length)
    for (let i = 0; i < Math.min(40, rows.length); i++) {
      console.log(i, JSON.stringify((rows[i] || []).slice(0, 16)))
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
