import { AuthResponse } from './types.ts'

export async function authenticateApi(
  apiBaseUrl: string,
  username: string,
  password: string
): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`)
  }

  const authData: AuthResponse = await response.json()
  return authData.token.accessToken
}