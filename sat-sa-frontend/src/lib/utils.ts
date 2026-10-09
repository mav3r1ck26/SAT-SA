import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'Critical': return 'bg-red-50 text-red-700 border-red-200';
    case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Low': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Informational': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Review': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Complete': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Warning': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Dismissed': return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
    case 'New': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Complete': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'Critical': return 'bg-red-50 text-red-700 border-red-200';
    case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Moderate': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Normal': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Low': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function getFindingTypeColor(type: string): string {
  switch (type) {
    case 'EXECUTION_GAP': return 'bg-red-50 text-red-700 border-red-200';
    case 'NEGATIVE_SPACE': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'ANOMALY': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'PEER_DEVIATION': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'DATA_QUALITY': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'RISK_INDICATOR': return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'ML_RISK': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

const RATING_CONFIG: Record<string, { thresholds: Array<{ threshold: number; rating: string }>; direction?: 'higher_better' }> = {
  false_positive_rate: { thresholds: [{ threshold: 0.05, rating: 'Excellent' }, { threshold: 0.15, rating: 'Good' }, { threshold: 0.3, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }] },
  incorrect_classification_ratio: { thresholds: [{ threshold: 0.05, rating: 'Excellent' }, { threshold: 0.1, rating: 'Good' }, { threshold: 0.2, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }] },
  analyst_efficiency: { thresholds: [{ threshold: 3, rating: 'Excellent' }, { threshold: 2, rating: 'Good' }, { threshold: 1, rating: 'Needs Improvement' }, { threshold: 0, rating: 'Critical' }], direction: 'higher_better' },
  insufficient_evidence_ratio: { thresholds: [{ threshold: 0.05, rating: 'Excellent' }, { threshold: 0.15, rating: 'Good' }, { threshold: 0.3, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }] },
  signature_age_days: { thresholds: [{ threshold: 30, rating: 'Excellent' }, { threshold: 90, rating: 'Good' }, { threshold: 180, rating: 'Needs Improvement' }, { threshold: 9999, rating: 'Critical' }] },
  playbook_gap_ratio: { thresholds: [{ threshold: 0.1, rating: 'Excellent' }, { threshold: 0.3, rating: 'Good' }, { threshold: 0.5, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }] },
};

export function getRating(metric: string, value: number): string {
  const config = RATING_CONFIG[metric];
  if (!config) return 'Unknown';
  
  if (config.direction === 'higher_better') {
    for (const { threshold, rating } of config.thresholds) {
      if (value >= threshold) return rating;
    }
    return 'Critical';
  } else {
    for (const { threshold, rating } of config.thresholds) {
      if (value <= threshold) return rating;
    }
    return 'Critical';
  }
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
}

const EFFICIENCY_INTERPRETATIONS: Record<string, { thresholds: Array<{ threshold: number; rating: string }>; unit: string; direction: 'lower_better' | 'higher_better' }> = {
  false_positive_rate: { thresholds: [{ threshold: 0.05, rating: 'Excellent' }, { threshold: 0.15, rating: 'Good' }, { threshold: 0.3, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }], unit: '%', direction: 'lower_better' },
  incorrect_classification_ratio: { thresholds: [{ threshold: 0.05, rating: 'Excellent' }, { threshold: 0.1, rating: 'Good' }, { threshold: 0.2, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }], unit: '%', direction: 'lower_better' },
  analyst_efficiency: { thresholds: [{ threshold: 3, rating: 'Excellent' }, { threshold: 2, rating: 'Good' }, { threshold: 1, rating: 'Needs Improvement' }, { threshold: 0, rating: 'Critical' }], unit: 'cases/hr', direction: 'higher_better' },
  insufficient_evidence_ratio: { thresholds: [{ threshold: 0.05, rating: 'Excellent' }, { threshold: 0.15, rating: 'Good' }, { threshold: 0.3, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }], unit: '%', direction: 'lower_better' },
  signature_age_days: { thresholds: [{ threshold: 30, rating: 'Excellent' }, { threshold: 90, rating: 'Good' }, { threshold: 180, rating: 'Needs Improvement' }, { threshold: 9999, rating: 'Critical' }], unit: 'days', direction: 'lower_better' },
  playbook_gap_ratio: { thresholds: [{ threshold: 0.1, rating: 'Excellent' }, { threshold: 0.3, rating: 'Good' }, { threshold: 0.5, rating: 'Needs Improvement' }, { threshold: 1, rating: 'Critical' }], unit: '%', direction: 'lower_better' },
};

export function formatValue(target: string, value: number): string {
  const config = EFFICIENCY_INTERPRETATIONS[target];
  if (!config) return value.toFixed(2);
  
  const unit = config.unit;
  if (unit === '%') return `${(value * 100).toFixed(1)}%`;
  if (unit === 'days') return `${value.toFixed(0)} days`;
  if (unit === 'cases/hr') return `${value.toFixed(1)} cases/hr`;
  return value.toFixed(2);
}
