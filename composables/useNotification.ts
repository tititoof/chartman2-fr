// composables/useNotification.ts
import { reactive } from 'vue'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

const state = reactive({
  show:    false,
  message: '',
  type:    'success' as NotificationType,
  timeout: 3000
})

export const useNotification = () => {
  const notify = (message: string, type: NotificationType = 'success', timeout = 3000) => {
    state.message = message
    state.type    = type
    state.timeout = timeout
    state.show    = true
  }

  const success = (message: string) => notify(message, 'success')
  const error   = (message: string) => notify(message, 'error')
  const warning = (message: string) => notify(message, 'warning')

  return { state, notify, success, error, warning }
}
