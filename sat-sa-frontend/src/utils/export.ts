/**
 * Enterprise Data Export & Reporting Utilities for SAT-SA
 * Air-gap compliant, in-browser cryptographic & data export routines.
 */

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '""'
    const str = String(cell)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerLine = headers.map(escapeCell).join(',')
  const rowLines = rows.map(r => r.map(escapeCell).join(','))
  const csvContent = [headerLine, ...rowLines].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadJSON(filename: string, data: any): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function printDossier(title: string, sections: { heading: string; content: string | Record<string, any> }[]): void {
  const printWindow = window.open('', '_blank', 'width=900,height=800')
  if (!printWindow) return

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title} — SAT-SA Examination Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; color: #111; padding: 30px; line-height: 1.5; }
    h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 4px; }
    .badge { display: inline-block; background: #eee; border: 1px solid #ccc; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 16px; }
    .section { margin-top: 24px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 14px; page-break-inside: avoid; }
    .section-title { font-size: 13px; text-transform: uppercase; font-weight: bold; color: #555; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    th { background: #f7f7f7; font-weight: bold; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px; overflow-x: auto; white-space: pre-wrap; }
    .footer { margin-top: 30px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
    @media print {
      body { padding: 10px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="badge">NATIONAL CRITICAL INFRASTRUCTURE PROTECTION CENTRE // SUPERVISORY ASSESSMENT TOOL (SAT-SA)</div>
  <p style="font-size: 11px; color: #666; margin-top: -8px;">Generated on ${new Date().toLocaleString()} IST · Air-gap Sovereign Node</p>
  
  ${sections.map(s => `
    <div class="section">
      <div class="section-title">${s.heading}</div>
      ${typeof s.content === 'string' 
        ? `<p style="font-size: 12px;">${s.content}</p>` 
        : Array.isArray(s.content)
        ? `<table>
            <thead><tr>${Object.keys(s.content[0] || {}).map(k => `<th>${k}</th>`).join('')}</tr></thead>
            <tbody>${s.content.map(row => `<tr>${Object.values(row).map(v => `<td>${typeof v === 'object' ? JSON.stringify(v) : v}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>`
        : `<pre>${JSON.stringify(s.content, null, 2)}</pre>`
      }
    </div>
  `).join('')}

  <div class="footer">
    Classification: RESTRICTED // STATUTORY SUPERVISORY EXAMINATION EVIDENCE UNDER IT ACT SECTION 70.
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
`
  printWindow.document.write(html)
  printWindow.document.close()
}
