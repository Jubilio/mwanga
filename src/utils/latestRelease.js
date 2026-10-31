// Reads the newest Android release from GitHub Releases (public, no token needed).
// The release notes are written by .github/workflows/android-release.yml.
export const RELEASES_REPO = import.meta.env.VITE_RELEASES_REPO || 'Jubilio/mwanga';
export const RELEASES_PAGE = `https://github.com/${RELEASES_REPO}/releases`;
export const LATEST_APK_URL = `${RELEASES_PAGE}/latest/download/mwanga.apk`;

const HEX_64 = /`([0-9a-f]{64})`/i;
const CERT = /`((?:[0-9A-F]{2}:){31}[0-9A-F]{2})`/i;

/** Extracts the APK and certificate fingerprints from the release notes table. */
export function parseReleaseNotes(body = '') {
  const apkLine = body.split('\n').find(line => /SHA-256 do APK/i.test(line)) || '';
  const certLine = body.split('\n').find(line => /Certificado/i.test(line)) || '';
  return {
    apkSha256: apkLine.match(HEX_64)?.[1]?.toLowerCase() || null,
    certSha256: certLine.match(CERT)?.[1]?.toUpperCase() || null,
  };
}

/** Turns the GitHub API response into what the download page shows. */
export function summariseRelease(release) {
  if (!release || release.draft) return null;
  const apk = release.assets?.find(asset => asset.name === 'mwanga.apk');
  if (!apk) return null;
  return {
    version: String(release.tag_name || '').replace(/^v/, ''),
    publishedAt: release.published_at,
    url: apk.browser_download_url,
    sizeMb: Math.round((apk.size / 1024 / 1024) * 10) / 10,
    pageUrl: release.html_url,
    ...parseReleaseNotes(release.body),
  };
}

export async function fetchLatestRelease(signal) {
  const response = await fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  return summariseRelease(await response.json());
}
