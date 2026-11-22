export function safeErrorMessage(error: unknown, status: number, fallback = 'The request could not be completed.'): string {
  if (status >= 500) {
    console.error('[API] Request failed:', error instanceof Error ? error.name : 'Unknown error')
    return fallback
  }
  return error instanceof Error ? error.message : fallback
}
