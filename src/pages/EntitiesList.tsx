import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { fetchEntities } from '../api/client'
import { StatusBadge, RiskScoreBar } from '../components/ui'
import { Search, Download } from 'lucide-react'

export default function EntitiesList() {
  const { setCurrentPage, setSelectedEntity } = useApp()
  const [entities, setEntities] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [criticalityFilter, setCriticalityFilter] = useState('')
  const [sortKey, setSortKey] = useState<string>('riskScore')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    const params: Record<string, string> = {}
    if (sectorFilter) params.sector = sectorFilter
    if (criticalityFilter) params.criticality = criticalityFilter
    fetchEntities(Object.keys(params).length ? params : undefined).then(setEntities).catch(() => setEntities([]))
  }, [sectorFilter, criticalityFilter])

  const openEntity = (id: string) => { setSelectedEntity(id); setCurrentPage('entity') }

  const filtered = entities
    .filter(e => !search || e.id.toLowerCase().includes(search.toLowerCase()) || (e.name || '').toLowerCase().includes(search.toLowerCase()) || (e.sector || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const dir = sortAsc ? 1 : -1
      if (typeof a[sortKey] === 'string') return (a[sortKey] || '').localeCompare(b[sortKey] || '') * dir
      return ((a[sortKey] || 0) - (b[sortKey] || 0)) * dir
    })

  const cols = [
    { key: 'id', label: 'Entity' }, { key: 'name', label: 'Name' }, { key: 'sector', label: 'Sector' },
    { key: 'criticality', label: 'Criticality' }, { key: 'riskScore', label: 'Risk Score' },
    { key: 'executionGaps', label: 'Gaps' }, { key: 'negativeSpace', label: 'Neg. Space' },
    { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }
  ]
  const toggleSort = (k: string) => { if (sortKey === k) setSortAsc(a => !a); else { setSortKey(k); setSortAsc(false) } }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div><h1 className="page-title">Entities</h1><p className="page-subtitle">All assessed Critical Sector Entities — from MongoDB</p></div>
        <button className="btn btn-sm"><Download className="w-3.5 h-3.5" /> Export CSV</button>
      </div>
      <div className="flex items-center gap-3 mb-4 mt-3">
        <div className="relative max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="input pl-8 w-full" placeholder="Search entity, name, sector..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
          <option value="">All Sectors</option>
          {['Banking','Power','Telecom','Transport','Energy','Government','Defence','Health','Water'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={criticalityFilter} onChange={e => setCriticalityFilter(e.target.value)}>
          <option value="">All Criticality</option>
          {['Critical','High','Medium','Low'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>{cols.map(c => (
              <th key={c.key} className="cursor-pointer select-none" onClick={() => toggleSort(c.key)}>
                <span className="flex items-center gap-1">{c.label}<span className="text-slate-300">{sortKey === c.key ? (sortAsc ? '↑' : '↓') : '↕'}</span></span>
              </th>
            ))}</tr></thead>
            <tbody>
              {filtered.map((e: any) => (
                <tr key={e.id} className="cursor-pointer" onClick={() => openEntity(e.id)}>
                  <td className="mono-id">{e.id}</td>
                  <td className="text-[12px] text-slate-700 font-medium">{e.name}</td>
                  <td className="text-[12px] text-slate-600">{e.sector}</td>
                  <td><StatusBadge status={e.criticality} /></td>
                  <td><RiskScoreBar score={e.riskScore ?? 50} showLabel /></td>
                  <td className="font-mono text-[12px] text-slate-600 text-center">{e.executionGaps}</td>
                  <td className="font-mono text-[12px] text-slate-600 text-center">{e.negativeSpace}</td>
                  <td><StatusBadge status={e.priority} /></td>
                  <td><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}