export const DOCUMENT_BUNDLE_CATEGORIES = ['SIEM JSON', 'CEF CSV', 'Cases CSV'] as const

export type DocumentBundleCategory = typeof DOCUMENT_BUNDLE_CATEGORIES[number]
