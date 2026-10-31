import { describe, expect, it } from 'vitest';
import { parseReleaseNotes, summariseRelease } from './latestRelease';

const apkSha = 'ab'.repeat(32);
const cert = Array(32).fill('C3').join(':');
const body = [
  '| Versão | 1.2.3 (código 10203) |',
  `| SHA-256 do APK | \`${apkSha}\` |`,
  `| Certificado de assinatura (SHA-256) | \`${cert}\` |`,
].join('\n');

describe('latest release', () => {
  it('reads both fingerprints from the notes', () => {
    expect(parseReleaseNotes(body)).toEqual({ apkSha256: apkSha, certSha256: cert });
  });

  it('returns nulls when the notes have no table', () => {
    expect(parseReleaseNotes('just text')).toEqual({ apkSha256: null, certSha256: null });
  });

  it('summarises a release with the APK asset', () => {
    const summary = summariseRelease({
      tag_name: 'v1.2.3',
      published_at: '2026-11-01T10:00:00Z',
      html_url: 'https://github.com/x/y/releases/tag/v1.2.3',
      body,
      assets: [{ name: 'mwanga.apk', size: 12 * 1024 * 1024, browser_download_url: 'https://dl/mwanga.apk' }],
    });
    expect(summary).toMatchObject({ version: '1.2.3', sizeMb: 12, url: 'https://dl/mwanga.apk', apkSha256: apkSha });
  });

  it('ignores drafts and releases without an APK', () => {
    expect(summariseRelease({ draft: true, assets: [{ name: 'mwanga.apk' }] })).toBeNull();
    expect(summariseRelease({ assets: [] })).toBeNull();
  });
});

describe('pickRelease', () => {
  const apk = { name: 'mwanga.apk', browser_download_url: 'https://x/v1.apk', size: 1048576 };
  it('accepts a pre-release that has the APK', async () => {
    const { pickRelease } = await import('./latestRelease');
    const result = pickRelease([
      { tag_name: 'v1.1.0', draft: true, assets: [apk] },
      { tag_name: 'v1.0.0', prerelease: true, published_at: '2026-10-31T17:42:29Z', assets: [apk], body: '' },
    ]);
    expect(result.version).toBe('1.0.0');
    expect(result.url).toBe('https://x/v1.apk');
  });
  it('returns null when no release has the APK', async () => {
    const { pickRelease } = await import('./latestRelease');
    expect(pickRelease([{ tag_name: 'v1', assets: [] }])).toBeNull();
    expect(pickRelease(null)).toBeNull();
  });
});
