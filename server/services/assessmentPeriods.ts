export const ASSESSMENT_PERIODS = [
  'Q3 FY 2025-26',
  'Q4 FY 2025-26',
  'Q1 FY 2026-27',
  'Q2 FY 2026-27'
] as const

export const DEFAULT_ASSESSMENT_PERIOD = 'Q2 FY 2026-27'

export function normalizeAssessmentPeriod(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_ASSESSMENT_PERIOD
  return value.trim().replace(/[–—]/g, '-')
}

export function isAssessmentPeriod(value: string): boolean {
  return (ASSESSMENT_PERIODS as readonly string[]).includes(value)
}

export function assessmentPeriodOrder(value: string): number {
  return (ASSESSMENT_PERIODS as readonly string[]).indexOf(value)
}
