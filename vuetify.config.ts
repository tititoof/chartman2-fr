// vuetify.config.ts
import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

const chartman2frLightTheme = {
    dark: false,
    colors: {
      primary: '#00658e',
      secondary: '#745b00',
      info: '#006a63',
      error: '#b50079',
      warning: '#a53b12',
      success: '#006e21',
      background: '#f8fdff',
      surface: '#F5F5F5',
      'on-primary': '#ffffff',
      'on-secondary': '#ffffff',
      'on-info': '#ffffff',
      'on-error': '#ffffff',
      'on-warning': '#ffffff',
      'on-success': '#ffffff',
      'on-background': '#1b1c18',
      'primary-container': '#c7e7ff',
      'secondary-container': '#ffe08c',
      'info-container': '#66f9ea',
      'error-container': '#ffd8e7',
      'success-container': '#89fb8d',
      'warning-container': '#ffdbd0',
      'on-primary-container': '#001e2e',
      'on-secondary-container': '#241a00',
      'on-info-container': '#00201d',
      'on-error-container': '#3d0026',
      'on-success-container': '#002105',
      'on-warning-container': '#390c00'
    }
  }
  
  const chartman2frDarkTheme = {
    dark: true,
    colors: {
      primary: '#85cfff',
      secondary: '#edc239',
      info: '#41dcce',
      error: '#ffafd3',
      warning: '#ffb59c',
      success: '#6dde73',
      background: '#001f25',
      surface: '#234751',
      code: '#303030',
      'on-primary': '#00344c',
      'on-secondary': '#3d2f00',
      'on-info': '#003733',
      'on-error': '#620040',
      'on-success': '#00390d',
      'on-warning': '#5c1900',
      'on-background': '#a6eeff',
      'primary-container': '#004c6c',
      'secondary-container': '#584400',
      'info-container': '#00504a',
      'error-container': '#8b005c',
      'success-container': '#005316',
      'warning-container': '#832700',
      'on-primary-container': '#c7e7ff',
      'on-secondary-container': '#ffe08c',
      'on-info-container': '#66f9ea',
      'on-error-container': '#ffd8e7',
      'on-success-container': '#89fb8d',
      'on-warning-container': '#ffdbd0'
    }
  }

export default defineVuetifyConfiguration({
    icons: {
      defaultSet: 'unocss-mdi'
    },
    theme: {
        defaultTheme: 'chartman2frLightTheme',
        themes: {
            chartman2frLightTheme,
            chartman2frDarkTheme
        }
    }
})