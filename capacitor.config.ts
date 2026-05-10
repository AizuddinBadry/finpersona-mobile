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
    // 'LIGHT' style = dark text for light backgrounds (we have a #FAF8FF bg).
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FAF8FF',
    },
    LocalNotifications: {
      smallestUnit: 'minute',
      sound: 'default',
      iconColor: '#6E4CE6',
    },
  },
};

export default config;
