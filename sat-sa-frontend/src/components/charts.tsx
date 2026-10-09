// ===== Stacked Bar Chart (Risk Distribution) =====
export function StackedBar({ data }: { data: { level: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  return (
    <div>
      <div className="flex h-3.5 rounded-lg overflow-hidden bg-stone-200 border border-stone-300 p-0.5 gap-0.5">
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.level}: ${d.count}`}
            className="h-full rounded-sm transition-all hover:opacity-90"
            style={{ width: `${(d.count / total) * 100}%`, backgroundColor: d.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] text-slate-600 font-medium">{d.level}</span>
            <span className="text-[11px] font-mono font-semibold text-slate-800">({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Simple Bar Chart =====
export function BarChart({ data, color = '#4f46e5', height = 120, valueFormatter }: {
  data: { label: string; value: number }[]
  color?: string
  height?: number
  valueFormatter?: (v: number) => string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group" title={`${d.label}: ${valueFormatter ? valueFormatter(d.value) : d.value}`}>
            <div className="w-full flex justify-center h-full items-end">
              <div
                className="rounded-t-md transition-all group-hover:brightness-110"
                style={{
                  height: Math.max(((d.value || 0) / max) * (height - 24), 4),
                  width: '75%',
                  backgroundColor: color,
                  boxShadow: 'none'
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate w-full text-center group-hover:text-indigo-600 transition-colors">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Multi-series Bar Chart =====
export function MultiBar({ data, series, height = 130 }: {
  data: { label: string; [key: string]: any }[]
  series: { key: string; label: string; color: string }[]
  height?: number
}) {
  const values = data.flatMap(d => series.map(s => d[s.key] ?? 0))
  const max = Math.max(...values, 1)
  return (
    <div>
      <div className="flex items-end gap-2.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="flex w-full items-end justify-center gap-1" style={{ height: height - 24 }}>
              {series.map((s, j) => (
                <div
                  key={j}
                  className="rounded-t-sm w-1/2 min-w-[5px] transition-all group-hover:brightness-110"
                  style={{
                    backgroundColor: s.color,
                    height: `${Math.max(4, (d[s.key] / max) * 100)}%`,
                    boxShadow: 'none'
                  }}
                  title={`${d.label} - ${s.label}: ${d[s.key]}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500 font-mono w-full text-center truncate">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 flex-wrap pt-2 border-t border-stone-200">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-slate-600 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Donut / Segmented =====
export function Donut({ data, size = 140, thickness = 16, centerLabel, centerValue }: {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let offset = 0
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e5e4" strokeWidth={thickness} />
          {data.map((d, i) => {
            const frac = (d.value || 0) / total
            const seg = (
              <circle
                key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color} strokeWidth={thickness} strokeDasharray={`${frac * c} ${c}`}
                strokeDashoffset={-offset * c} strokeLinecap="butt"
                style={{ filter: 'none' }}
              />
            )
            offset += frac
            return seg
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          {centerValue && <span className="text-2xl font-bold text-slate-900 font-mono leading-none">{centerValue}</span>}
          {centerLabel && <span className="text-[10px] text-slate-700 font-mono mt-0.5 uppercase tracking-wider">{centerLabel}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-[11.5px] text-slate-600 font-medium">{d.label}</span>
            <span className="font-mono text-[11.5px] text-indigo-600 font-semibold ml-auto">{(d.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Horizontal Bar =====
export function HBar({ data }: { data: { label: string; value: number; sub?: string; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[12px] text-slate-700 font-medium">{d.label}</span>
            {d.sub && <span className="text-[11px] font-mono text-slate-500">{d.sub}</span>}
          </div>
          <div className="risk-bar-track bg-stone-200 border border-stone-200">
            <div
              className={`risk-bar-fill ${d.color || 'bg-indigo-500'}`}
              style={{ width: `${((d.value || 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== Heatmap (Coverage Matrix) =====
export function Heatmap({ rows, columns, data }: {
  rows: string[]
  columns: string[]
  data: number[][]
}) {
  const colColor = (v: number) => {
    if (v >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (v >= 60) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (v >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr className="bg-stone-50">
            <th className="text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 px-4 py-3 border-b border-stone-200 font-mono">Infrastructure Telemetry</th>
            {columns.map((c, i) => (
              <th key={i} className="text-center text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-3 border-b border-stone-200 whitespace-nowrap font-mono">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-stone-200 hover:bg-stone-50 transition-colors">
              <td className="px-4 py-2.5 text-[12px] font-medium text-slate-700 whitespace-nowrap font-mono">{row}</td>
              {(data[i] || []).map((v, j) => (
                <td key={j} className="px-2 py-2 text-center">
                  <div className={`inline-block min-w-[50px] px-2 py-1 rounded-md text-[11.5px] font-mono font-bold border ${colColor(v)}`}>
                    {v}%
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== Line / Area Chart =====
export function AreaChart({ data, series, height = 160 }: {
  data: any[]
  series: { key: string; label: string; color: string }[]
  height?: number
}) {
  const w = 480
  const h = height
  const pad = { top: 14, right: 12, bottom: 24, left: 40 }
  const allV = data.flatMap(d => series.map(s => d[s.key] ?? 0))
  const max = Math.max(...allV, 1)
  const innerW = w - pad.left - pad.right
  const innerH = h - pad.top - pad.bottom
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW
  const x = (i: number) => pad.left + i * stepX
  const y = (v: number) => pad.top + innerH - ((v || 0) / max) * innerH

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="max-w-full" style={{ minWidth: 400 }}>
        {[0.25, 0.5, 0.75, 1].map((f, i) => (
          <g key={i}>
            <line x1={pad.left} x2={w - pad.right} y1={pad.top + innerH * (1 - f)} y2={pad.top + innerH * (1 - f)} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="3 3" />
            <text x={pad.left - 6} y={pad.top + innerH * (1 - f) + 3} textAnchor="end" fontSize="9" fill="#64748b" className="font-mono">{Math.round(max * f).toLocaleString()}</text>
          </g>
        ))}
        <line x1={pad.left} x2={w - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#cbd5e1" />
        {series.map((s, si) => {
          const linePts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')
          const areaPts = `${pad.left},${pad.top + innerH} ${linePts} ${w - pad.right},${pad.top + innerH}`
          return (
            <g key={si}>
              <polygon points={areaPts} fill={s.color} opacity="0.15" />
              <polyline points={linePts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
            </g>
          )
        })}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill="#64748b" className="font-mono">{d.label}</text>
        ))}
      </svg>
      <div className="flex gap-4 mt-2 flex-wrap pt-2 border-t border-stone-200">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-slate-500 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Radar Chart (Entity score breakdown) =====
export function Radar({ data, max = 100, size = 220 }: {
  data: { label: string; value: number }[]
  max?: number
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 32
  const n = data.length || 1
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, v: number = 0) => [cx + r * ((v || 0) / max) * Math.cos(angle(i)), cy + r * ((v || 0) / max) * Math.sin(angle(i))]
  const poly = data.map((d, i) => point(i, d.value || 0).join(',')).join(' ')

  return (
    <svg width={size} height={size} className="mx-auto overflow-visible">
      {[0.25, 0.5, 0.75, 1].map((f, i) => {
        const pts = data.map((_, j) => point(j, max * f).join(',')).join(' ')
        return <polygon key={i} points={pts} fill="none" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="3 3" />
      })}
      {data.map((_, i) => {
        const [px, py] = point(i, max)
        return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="#e7e5e4" strokeWidth="1" />
      })}
      <polygon points={poly} fill="#6366f1" opacity="0.15" stroke="#4f46e5" strokeWidth="2.2" style={{ filter: 'none' }} />
      {data.map((d, i) => {
        const [px, py] = point(i, d.value || 0)
        const labelPos = point(i, max)
        return (
          <g key={i}>
            <circle cx={px} cy={py} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
            <text x={labelPos[0]} y={labelPos[1]} textAnchor="middle" fontSize="10" fill="#475569" className="font-mono font-semibold" dy={labelPos[1] < cy ? -6 : 12}>
              {d.label} <tspan fill="#4f46e5" fontWeight="700">({d.value ?? 0})</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ===== Score Bars (horizontal) =====
export function ScoreBars({ data }: { data: { label: string; value: number }[] }) {
  const color = (v: number = 0) => v >= 85 ? '#f43f5e' : v >= 70 ? '#f97316' : v >= 55 ? '#f59e0b' : v >= 40 ? '#4f46e5' : '#10b981'
  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-28 text-[12px] text-slate-600 font-medium font-mono">{d.label}</span>
          <div className="risk-bar-track flex-1 bg-stone-200 border border-stone-200">
            <div className="risk-bar-fill" style={{ width: `${d.value ?? 0}%`, backgroundColor: color(d.value ?? 0), boxShadow: 'none' }} />
          </div>
          <span className="w-8 text-right font-mono text-[12px] font-bold text-slate-900">{d.value ?? 0}</span>
        </div>
      ))}
    </div>
  )
}
