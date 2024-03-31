import { useApplicationStore } from '~/stores/application'
import { usePreferredDark } from '@vueuse/core'

export const setTheme = () => {
  const applicationStore = useApplicationStore()
  // const colorMode = useColorMode()
  const colorMode = usePreferredDark()
  const storeThemeDark = computed(() => applicationStore.getIsDarkTheme)
  const storeThemeDefined = computed(() => applicationStore.getIsThemeDefined)

  console.log(colorMode.value)
  if (storeThemeDefined.value === true) {
    return storeThemeDark.value === true
      ? 'chartman2frDarkTheme'
      : 'chartman2frLightTheme'
  } else if (colorMode.value === true) {
    return 'chartman2frDarkTheme'
  } else {
    return 'chartman2frLightTheme'
  }
}
