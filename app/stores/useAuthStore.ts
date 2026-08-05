// stores/useAuthStore.ts
// Note: remplacer 'User' par le type réel de votre API d'authentification

type User = {
  id: number,
  email: string,
  name?: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.user,
    userId: (state): number | null => state.user?.id ?? null
  },

  actions: {
    setUser(user: User) {
      this.user = user
    },
    logout() {
      this.user = null
    }
  }
})