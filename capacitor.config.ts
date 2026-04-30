import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aexlora.finpersona',
  appName: 'Finpersona',
  webDir: 'dist',
  ios: { contentInset: 'always' },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#FAF8FF',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
      style: 'light',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FAF8FF',
    },
  },
};

export default config;
