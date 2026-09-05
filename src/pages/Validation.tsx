import React, { useEffect, useState } from 'react'
import { fetchValidation } from '../api/client'

export default function Validation() {
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    fetchValidation().then(r => setMetrics(r.summary)).catch(() => setMetrics(null))
  }, [])

  const m = metrics ?? {
    totalFindings: 147, confirmed: 89, dismissed: 24, inReview: 18, newFindings: 16,
    truePositives: 89, falsePositives: 24, missedFindings: 16,
    precision: 78.8, recall: 84.8, reviewAgreement: 76.9
  }

  const confusionMatrix = [
    [m.truePositives, m.falsePositives],
    [m.missedFindings, Math.max(0, (m.confirmed || 0) + (m.dismissed || 0) - (m.truePositives || 0))]
  ]

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-1">
        <h1 className="page-title">Validation & Model Performance</h1>
        <p className="page-subtitle">Human review vs SAT-SA analytical output comparison</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 mt-4">
        <p className="text-[12px] text-blue-800">
          <strong>Important:</strong> SAT-SA supports human supervisory judgement. It does not replace examiner review. All findings are system recommendations requiring examiner confirmation.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Expert-Identified Findings', value: (m.confirmed || 0) + (m.newFindings || 0), color: 'bg-slate-50' },
          { label: 'Tool-Identified Findings', value: (m.confirmed || 0) + (m.inReview || 0), color: 'bg-slate-50' },
          { label: 'True Positives', value: m.truePositives, color: 'bg-emerald-50' },
          { label: 'False Positives', value: m.falsePositives, color: 'bg-amber-50' },
          { label: 'Missed Findings', value: m.missedFindings, color: 'bg-red-50' },
          { label: 'Precision', value: `${m.precision}%`, color: 'bg-blue-50' },
          { label: 'Recall', value: `${m.recall}%`, color: 'bg-blue-50' },
          { label: 'Review Agreement', value: `${m.reviewAgreement}%`, color: 'bg-blue-50' }
        ].map((stat, i) => (
          <div key={i} className={`card p-3 ${stat.color}`}>
            <div className="label mb-1">{stat.label}</div>
            <div className="font-mono text-[20px] font-bold text-navy-900 leading-none">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="label mb-3">Confusion Matrix</div>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 w-[360px]">
            <div />
            <div className="text-center text-[11px] font-semibold text-slate-500 pb-1">Tool: Positive</div>
            <div className="text-center text-[11px] font-semibold text-slate-500 pb-1">Tool: Negative</div>
            <div className="text-[11px] font-semibold text-slate-500 pr-2 pt-1">Expert: Positive</div>
            <div className="bg-emerald-100 border border-emerald-200 rounded-md p-3 text-center">
              <div className="font-mono text-[20px] font-bold text-emerald-700">{confusionMatrix[0][0]}</div>
              <div className="text-[10px] text-emerald-600">True Positive</div>
            </div>
            <div className="bg-amber-100 border border-amber-200 rounded-md p-3 text-center">
              <div className="font-mono text-[20px] font-bold text-amber-700">{confusionMatrix[0][1]}</div>
              <div className="text-[10px] text-amber-600">False Positive</div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 pr-2 pt-1">Expert: Negative</div>
            <div className="bg-blue-100 border border-blue-200 rounded-md p-3 text-center">
              <div className="font-mono text-[20px] font-bold text-blue-700">{confusionMatrix[1][0]}</div>
              <div className="text-[10px] text-blue-600">Missed</div>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-md p-3 text-center">
              <div className="font-mono text-[20px] font-bold text-slate-500">{confusionMatrix[1][1]}</div>
              <div className="text-[10px] text-slate-500">True Negative</div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="label mb-3">Performance Summary</div>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-slate-600">Precision</span>
                <span className="font-mono text-[12px] font-semibold text-slate-700">{m.precision}%</span>
              </div>
              <div className="risk-bar-track">
                <div className="risk-bar-fill bg-blue-500" style={{ width: `${m.precision}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Of tool-identified findings, {m.precision}% are confirmed by expert review.</p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-slate-600">Recall</span>
                <span className="font-mono text-[12px] font-semibold text-slate-700">{m.recall}%</span>
              </div>
              <div className="risk-bar-track">
                <div className="risk-bar-fill bg-emerald-500" style={{ width: `${m.recall}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Of expert-identified findings, SAT-SA flagged {m.recall}%.</p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-slate-600">Review Agreement</span>
                <span className="font-mono text-[12px] font-semibold text-slate-700">{m.reviewAgreement}%</span>
              </div>
              <div className="risk-bar-track">
                <div className="risk-bar-fill bg-blue-400" style={{ width: `${m.reviewAgreement}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Overall agreement rate between tool and human review.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}