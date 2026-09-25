import { useState, useEffect } from 'react';
import { getConfig, getConfigCategory, setConfig } from '../../api/client';
import { cn } from '../../lib/utils';

const categories = ['thresholds', 'weights', 'ml', 'scoring', 'peer', 'data_quality', 'general'];

export default function Settings() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('thresholds');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    Promise.all(categories.map(cat => getConfigCategory(cat))).then(results => {
      const all = results.flat();
      setConfigs(all);
    });
  }, []);

  const handleSave = async (key: string, value: any) => {
    await setConfig(key, value, 'Admin');
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
    setEditing(null);
  };

  const renderValue = (config: any) => {
    if (editing === config.key) {
      return (
        <input
          type={config.dataType === 'number' ? 'number' : config.dataType === 'boolean' ? 'checkbox' : 'text'}
          value={editValue}
          onChange={e => setEditValue(e.target.type === 'checkbox' ? e.target.checked : e.target.value)}
          onBlur={() => handleSave(config.key, editValue)}
          onKeyDown={e => e.key === 'Enter' && handleSave(config.key, editValue)}
          className="input w-48"
          autoFocus
        />
      );
    }

    if (config.dataType === 'boolean') {
      return (
        <input type="checkbox" checked={config.value} onChange={e => handleSave(config.key, e.target.checked)} />
      );
    }
    if (config.dataType === 'array') {
      return <span className="text-[11px] text-slate-500 font-mono">{JSON.stringify(config.value)}</span>;
    }
    if (config.dataType === 'object') {
      return <span className="text-[11px] text-slate-500 font-mono">{JSON.stringify(config.value)}</span>;
    }
    return <span className="font-mono text-slate-700">{config.value}</span>;
  };

  const categoryConfigs = configs.filter(c => c.category === activeCategory);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure thresholds, weights, and ML parameters</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
        {['thresholds', 'weights', 'ml', 'scoring', 'peer', 'data_quality', 'general'].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-md text-[12px] font-medium ${activeCategory === cat ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th className="w-64">Key</th><th className="w-80">Value</th><th>Description</th><th>Type</th><th>Range</th><th className="w-48"></th></tr>
            </thead>
            <tbody>
              {categoryConfigs.map(config => (
                <tr key={config.key} className={editing === config.key ? 'bg-blue-50/50' : ''}>
                  <td className="mono-id">{config.key}</td>
                  <td>{renderValue(config)}</td>
                  <td className="text-[11px] text-slate-500">{config.description}</td>
                  <td className="text-[11px] text-slate-500 capitalize">{config.dataType}</td>
                  <td className="text-[11px] text-slate-500">
                    {config.minValue !== undefined && config.maxValue !== undefined ? `${config.minValue} - ${config.maxValue}` : config.allowedValues ? config.allowedValues.join(', ') : '—'}
                  </td>
                  <td className="text-right">
                    {editing === config.key ? (
                      <div className="flex items-center gap-1">
                        <button className="btn btn-primary btn-sm" onClick={() => handleSave(config.key, editValue)}>Save</button>
                        <button className="btn btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm" onClick={() => { setEditing(config.key); setEditValue(String(config.value)); }}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}