import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mwanga.app',
  appName: 'Mwanga',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SocialLogin: {
      // Native Google sign-in only; other providers are not bundled.
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false
      },
      logLevel: 1
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      // Hidden from JS when the animated splash (src/components/AppSplash.jsx)
      // takes over with the same background colour.
      launchAutoHide: false,
      backgroundColor: "#0a4d68",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      // Fullscreen/immersive splash hides the system bars and the plugin never
      // shows them again, so the app header ended up under the status bar.
      splashFullScreen: false,
      splashImmersive: false,
    },
    SystemBars: {
      // index.html has no viewport-fit=cover, so Capacitor pads the WebView
      // natively below the status bar and above the gesture bar, and the
      // injected --safe-area-inset-* values stay 0 (no double padding).
      // Not "disable": since Capacitor 8.4 that also turns off the native
      // padding, which put the header back under the status bar.
      insetsHandling: "css",
      // Light status bar icons over the teal window background.
      style: "DARK"
    }
  }
};

export default config;
