import { describe, expect, it } from 'vitest';
import { detectInstallPlatform } from './installPlatform';

const iphoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const iphoneChrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1';
const iphoneWhatsApp = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const ipadDesktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const android = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

describe('detectInstallPlatform', () => {
  it('recognises Safari on iPhone', () => {
    expect(detectInstallPlatform({ userAgent: iphoneSafari })).toEqual({ ios: true, safari: true, standalone: false });
  });

  it('flags other iPhone browsers and in-app browsers as not Safari', () => {
    expect(detectInstallPlatform({ userAgent: iphoneChrome })).toMatchObject({ ios: true, safari: false });
    expect(detectInstallPlatform({ userAgent: iphoneWhatsApp })).toMatchObject({ ios: true, safari: false });
  });

  it('treats an iPad in desktop mode as iOS, but not a real Mac', () => {
    expect(detectInstallPlatform({ userAgent: ipadDesktop, maxTouchPoints: 5 })).toMatchObject({ ios: true, safari: true });
    expect(detectInstallPlatform({ userAgent: ipadDesktop, maxTouchPoints: 0 })).toMatchObject({ ios: false });
  });

  it('does not treat Android as iOS', () => {
    expect(detectInstallPlatform({ userAgent: android })).toMatchObject({ ios: false, safari: false });
  });

  it('passes through the installed flag', () => {
    expect(detectInstallPlatform({ userAgent: iphoneSafari, standalone: true }).standalone).toBe(true);
  });
});
