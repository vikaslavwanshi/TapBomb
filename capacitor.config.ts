import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tapbomb.game',
  appName: 'TapBomb',
  webDir: 'dist',
  server: {
    // For dev: uncomment and set to your machine's LAN IP for live-reload
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
    //
    // For prod: set to your Cloudflare Pages URL
    // url: 'https://tapbomb.pages.dev',
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
