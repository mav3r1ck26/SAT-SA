import React from 'react'

// ===== Stacked Bar Chart (Risk Distribution) =====
export function StackedBar({ data }: { data: { level: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div>
      <div className="flex h-4 rounded-md overflow-hidden">
        {data.map((d, i) => (
          <div key={i} title={`${d.level}: ${d.count}`} className="h-full" style={{ width: `${(d.count / total) * 100}%`, backgroundColor: d.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] text-slate-600">{d.level}</span>
            <span className="text-[11px] font-mono text-slate-400">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Simple Bar Chart =====
export function BarChart({ data, color = '#0ea5e9', height = 120, valueFormatter }: {
  data: { label: string; value: number }[]
  color?: string
  height?: number
  valueFormatter?: (v: number) => string
}) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.label}: ${valueFormatter ? valueFormatter(d.value) : d.value}`}>
            <div className="w-full flex justify-center">
              <div className="rounded-t bg-blue-500/80 group-hover:bg-blue-600 transition-colors" style={{ height: Math.max((d.value / max) * (height - 24), 3), width: '70%' }} />
            </div>
            <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Multi-series Bar Chart =====
export function MultiBar({ data, series, height = 120, valueFormatter }: {
  data: { label: string; [key: string]: any }[]
  series: { key: string; label: string; color: string }[]
  height?: number
  valueFormatter?: (v: number) => string
}) {
  const values = data.flatMap(d => series.map(s => d[s.key] ?? 0))
  const max = Math.max(...values, 1)
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: height - 22 }}>
              {series.map((s, j) => (
                <div
                  key={j} className="rounded-t w-1/2 min-w-[4px]" style={{ backgroundColor: s.color, height: `${(d[s.key] / max) * 100}%` }}
                  title={`${d.label} - ${s.label}: ${d[s.key]}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 w-full text-center truncate">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 flex-wrap">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-slate-600">{s.label}</span>
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
  const total = data.reduce((s, d) => s + d.value, 0)
  let offset = 0
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {data.map((d, i) => {
            const frac = d.value / total
            const seg = (
              <circle
                key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color} strokeWidth={thickness} strokeDasharray={`${frac * c} ${c}`}
                strokeDashoffset={-offset * c} strokeLinecap="butt"
              />
            )
            offset += frac
            return seg
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          {centerValue && <span className="text-xl font-bold text-navy-950 leading-none">{centerValue}</span>}
          {centerLabel && <span className="text-[10.5px] text-slate-400 mt-0.5">{centerLabel}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-[11.5px] text-slate-600">{d.label}</span>
            <span className="font-mono text-[11.5px] text-slate-700 ml-auto">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Horizontal Bar =====
export function HBar({ data }: { data: { label: string; value: number; sub?: string; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[11.5px] text-slate-700 font-medium">{d.label}</span>
            {d.sub && <span className="text-[11px] text-slate-400">{d.sub}</span>}
          </div>
          <div className="risk-bar-track">
            <div className={`risk-bar-fill ${d.color || 'bg-blue-500'}`} style={{ width: `${(d.value / max) * 100}%` }} />
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
    if (v >= 80) return 'bg-emerald-100 text-emerald-800'
    if (v >= 60) return 'bg-lime-100 text-lime-800'
    if (v >= 40) return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2 border-b border-slate-200">Coverage Category</th>
            {columns.map((c, i) => (
              <th key={i} className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-2 border-b border-slate-200 whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-3 py-2 text-[12px] font-medium text-slate-700 whitespace-nowrap">{row}</td>
              {data[i].map((v, j) => (
                <td key={j} className="px-2 py-1.5 text-center">
                  <div className={`inline-block min-w-[44px] px-2 py-1.5 rounded-md text-[12px] font-mono font-semibold ${colColor(v)}`}>
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
export function AreaChart({ data, series, height = 160, valueFormatter }: {
  data: any[]
  series: { key: string; label: string; color: string }[]
  height?: number
  valueFormatter?: (v: number) => string
}) {
  const w = 480
  const h = height
  const pad = { top: 12, right: 10, bottom: 22, left: 34 }
  const allV = data.flatMap(d => series.map(s => d[s.key]))
  const max = Math.max(...allV)
  const innerW = w - pad.left - pad.right
  const innerH = h - pad.top - pad.bottom
  const stepX = innerW / (data.length - 1)
  const x = (i: number) => pad.left + i * stepX
  const y = (v: number) => pad.top + innerH - (v / max) * innerH

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="max-w-full" style={{ minWidth: 400 }}>
        {[0.25, 0.5, 0.75, 1].map((f, i) => (
          <g key={i}>
            <line x1={pad.left} x2={w - pad.right} y1={pad.top + innerH * (1 - f)} y2={pad.top + innerH * (1 - f)} stroke="#eef2f7" strokeWidth="1" />
            <text x={pad.left - 4} y={pad.top + innerH * (1 - f) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{Math.round(max * f).toLocaleString()}</text>
          </g>
        ))}
        <line x1={pad.left} x2={w - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#e2e8f0" />
        {series.map((s, si) => {
          const linePts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')
          const areaPts = `${pad.left},${pad.top + innerH} ${linePts} ${w - pad.right},${pad.top + innerH}`
          return (
            <g key={si}>
              <polygon points={areaPts} fill={s.color} opacity="0.08" />
              <polyline points={linePts} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" />
            </g>
          )
        })}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</text>
        ))}
      </svg>
      <div className="flex gap-4 mt-1 flex-wrap">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-slate-600">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Radar Chart (Entity score breakdown) =====
export function Radar({ data, max = 100, size = 200 }: {
  data: { label: string; value: number }[]
  max?: number
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 28
  const n = data.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, v: number) => [cx + r * (v / max) * Math.cos(angle(i)), cy + r * (v / max) * Math.sin(angle(i))]
  const poly = data.map((d, i) => point(i, d.value).join(',')).join(' ')

  return (
    <svg width={size} height={size} className="mx-auto">
      {[0.25, 0.5, 0.75, 1].map((f, i) => {
        const pts = data.map((_, j) => point(j, max * f).join(',')).join(' ')
        return <polygon key={i} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      })}
      {data.map((_, i) => {
        const [px, py] = point(i, max)
        return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="#e2e8f0" strokeWidth="1" />
      })}
      <polygon points={poly} fill="#0ea5e9" opacity="0.12" stroke="#0284c7" strokeWidth="2" />
      {data.map((d, i) => {
        const [px, py] = point(i, d.value)
        const labelPos = point(i, max)
        return (
          <g key={i}>
            <circle cx={px} cy={py} r="3" fill="#0284c7" />
            <text x={labelPos[0]} y={labelPos[1]} textAnchor="middle" fontSize="10" fill="#475569" dy={labelPos[1] < 12 ? 10 : -4}>
              {d.label} <tspan fill="#0f172a" fontWeight="600">{d.value}</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ===== Score Bars (horizontal) =====
export function ScoreBars({ data }: { data: { label: string; value: number }[] }) {
  const color = (v: number) => v >= 85 ? '#ef4444' : v >= 70 ? '#f97316' : v >= 55 ? '#f59e0b' : v >= 40 ? '#3b82f6' : '#10b981'
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-24 text-[11.5px] text-slate-600 font-medium">{d.label}</span>
          <div className="risk-bar-track flex-1">
            <div className="risk-bar-fill" style={{ width: `${d.value}%`, backgroundColor: color(d.value) }} />
          </div>
          <span className="w-7 text-right font-mono text-[11.5px] font-semibold text-slate-700">{d.value}</span>
        </div>
      ))}
    </div>
  )
}
