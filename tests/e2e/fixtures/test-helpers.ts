// tests/e2e/fixtures/test-helpers.ts
import type { APIRequestContext } from '@playwright/test'

export async function createViaApi(
  request: APIRequestContext,
  endpoint: string,
  data: Record<string, unknown>
) {
  const response = await request.post(`/api${endpoint}`, { data })
  if (!response.ok()) {
    throw new Error(`API error ${response.status()}: ${await response.text()}`)
  }
  return response.json()
}

export async function deleteViaApi(
  request: APIRequestContext,
  endpoint: string,
  id: number
) {
  await request.delete(`/api${endpoint}/${id}`)
}

export async function loginAs(
  request: APIRequestContext,
  email: string,
  password: string
) {
  const response = await request.post('/api/auth/login', { data: { email, password } })
  return response.json()
}
