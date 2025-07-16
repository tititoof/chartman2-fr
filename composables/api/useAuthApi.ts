import { useBackendApi } from '~/composables/useBackendApi'
export const useAuthApi = () => {
  const signIn = async (credentials: { email: string; password: string }) => {
    const endpoint = '/users/tokens/sign_in'

    return await useBackendApi(endpoint, 'POST', credentials, false)
  }

  const signOut = async () => {
    const endpoint = '/users/tokens/revoke'
    
    return await useBackendApi(endpoint, 'POST', null, false)
  }

  return { signIn, signOut }
}