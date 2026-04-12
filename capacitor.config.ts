import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zerobreakgolf.zerobreak',
  appName: 'ZeroBreak',
  webDir: 'dist',
  plugins: {
    // Route all fetch() and XHR through the native iOS HTTP stack.
    // This bypasses WKWebView's CORS enforcement, which blocks cross-origin
    // canvas pixel reads (e.g. fetching GI CloudFront images for slope inference).
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
