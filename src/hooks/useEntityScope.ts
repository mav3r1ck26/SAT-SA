import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

export function useEntityScope(): string | undefined {
  const { entityFilter } = useApp()
  const { user } = useAuth()
  if (entityFilter !== 'ALL') return entityFilter
  if (user?.role === 'SOC Manager') return user.assignedEntityIds[0]
  return undefined
}
