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

export function printDossier(title: string, sections: { heading: string; content: any }[], targetWindow?: Window | null): void {
  const printWindow = targetWindow || window.open('', '_blank', 'width=900,height=800')
  if (!printWindow) return

  const escapeHtml = (value: unknown): string => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return '<span class="muted">—</span>'
    if (Array.isArray(value)) {
      if (value.length === 0) return '<p class="muted">No records in this section.</p>'
      if (value.every(row => row && typeof row === 'object' && !Array.isArray(row))) {
        const columns = [...new Set(value.flatMap(row => Object.keys(row)))]
        return `<table><thead><tr>${columns.map(key => `<th>${escapeHtml(key)}</th>`).join('')}</tr></thead><tbody>${value.map(row => `<tr>${columns.map(key => `<td>${renderCell(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      }
      return `<ul>${value.map(item => `<li>${renderCell(item)}</li>`).join('')}</ul>`
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value)
      if (!entries.length) return '<p class="muted">No details available.</p>'
      return `<table class="key-value"><tbody>${entries.map(([key, item]) => `<tr><th>${escapeHtml(key)}</th><td>${renderCell(item)}</td></tr>`).join('')}</tbody></table>`
    }
    return `<p>${escapeHtml(value)}</p>`
  }
  const renderCell = (value: any): string => {
    if (value === null || value === undefined || value === '') return '<span class="muted">—</span>'
    if (typeof value === 'object') return renderValue(value)
    return escapeHtml(value)
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"><title>${escapeHtml(title)} — SAT-SA Examination Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; color: #111; padding: 30px; line-height: 1.5; }
    h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 4px; }
    .badge { display: inline-block; background: #eee; border: 1px solid #ccc; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 16px; }
    .section { margin-top: 24px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 14px; page-break-inside: avoid; }
    .section-title { font-size: 13px; text-transform: uppercase; font-weight: bold; color: #555; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    th { background: #f7f7f7; font-weight: bold; }
    .key-value th { width: 28%; }
    td { overflow-wrap: anywhere; }
    ul { margin: 4px 0; padding-left: 20px; font-size: 12px; }
    p { font-size: 12px; }
    code { font-size: 10px; white-space: pre-wrap; }
    .muted { color: #777; }
    .footer { margin-top: 30px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
    @media print {
      body { padding: 10px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="badge">NATIONAL CRITICAL INFRASTRUCTURE PROTECTION CENTRE // SUPERVISORY ASSESSMENT TOOL (SAT-SA)</div>
  <p style="font-size: 11px; color: #666; margin-top: -8px;">Generated on ${escapeHtml(new Date().toLocaleString())} · Air-gap Sovereign Node</p>
  
  ${sections.map(s => `
    <div class="section">
      <div class="section-title">${s.heading}</div>
      ${renderValue(s.content)}
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
