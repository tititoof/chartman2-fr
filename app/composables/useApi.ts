// composables/useApi.ts
export const useApi = () => {
  const apiFetch = <T>(
    endpoint: string,
    options: Parameters<typeof $fetch>[1] = {}
  ): Promise<T> => {
    return $fetch<T>(`/api${endpoint}`, {
      ...options,
      credentials: 'include'
    })
  }
  return { apiFetch }
}