import { useEffect, useState } from 'react';
import { fetchReviewQueue } from '../api/client';
import { SeverityBadge, Confidence } from '../components/ui';

export default function ReviewPrioritisation() {
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    fetchReviewQueue().then(setQueue).catch(() => setQueue([]));
  }, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Manual Review Prioritisation</h1>
        <p className="page-subtitle">Recommended review queue for supervisory examination</p>
      </div>

      <div className="flex items-center gap-3 mt-4 mb-5">
        <span className="badge border bg-blue-50 text-blue-700 border-blue-200">System Recommendation</span>
        <span className="text-[12px] text-slate-500">Findings ranked by composite risk score. Requires examiner review before supervisory action.</span>
      </div>

      <div className="flex flex-col gap-4">
        {queue.length > 0 ? queue.map((item, idx) => (
          <div key={idx} className="card overflow-hidden">
            <div className={`flex items-center gap-3 px-4 py-2.5 border-l-4 ${item.severity === 'Critical' ? 'bg-red-50 border-red-500' : item.severity === 'High' ? 'bg-orange-50 border-orange-500' : 'bg-amber-50 border-amber-500'}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Priority {String(item.priority ?? idx + 1).padStart(2, '0')}</span>
              <SeverityBadge severity={item.severity} />
              <span className="mono-id">{item.entityId || item.entity}</span>
              <span className="text-slate-400">/</span>
              <span className="mono-id">{item.ref || item.findingId}</span>
              <span className="flex-1" />
              <Confidence value={item.confidence ?? 85} compact />
              <span className="text-[11px] text-slate-500">{item.evidenceCount ?? 0} evidence</span>
            </div>

            <div className="px-4 py-3">
              <p className="text-[12.5px] text-slate-700 font-medium mb-2">{item.reason || item.finding || item.title}</p>

              <div className="bg-slate-50 rounded-md px-3 py-2 mb-3">
                <div className="label mb-1">Why flagged</div>
                <ul className="flex flex-col gap-0.5">
                  {(item.reasons || item.reasonWrap || [item.reason]).filter(Boolean).map((r: any, j: number) => (
                    <li key={j} className="text-[12px] text-slate-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-[11.5px] text-slate-500 mb-3">
                Risk Score: <span className="font-mono font-semibold text-slate-700">{item.riskScore ?? item.score ?? 0}/100</span>
                <span className="mx-2">·</span>
                Confidence: <span className="font-mono font-semibold text-slate-700">{item.confidence ?? 0}%</span>
              </div>

              <div className="text-[11.5px] text-slate-600 italic mb-3">
                Suggested: {item.suggestedAction || 'Manual review recommended'}
              </div>

              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm">Review Evidence</button>
                <button className="btn btn-sm">Assign</button>
                <button className="btn btn-sm">Mark Reviewed</button>
              </div>
            </div>
          </div>
        )) : (
          <div className="card p-8 text-center text-[12px] text-slate-400">No findings requiring review at this time.</div>
        )}
      </div>
    </div>
  );
}
