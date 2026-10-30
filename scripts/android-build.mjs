import { spawnSync } from 'node:child_process';

const mode = process.argv[2] || 'debug';
if (!['debug', 'release', 'bundle'].includes(mode)) throw new Error('Use debug, release or bundle');
const api = new URL(process.env.VITE_API_URL || 'https://invalid.local');
if (!process.env.VITE_API_URL || api.protocol !== 'https:' || ['localhost', '127.0.0.1', 'invalid.local'].includes(api.hostname)) {
  throw new Error('Set VITE_API_URL to your public HTTPS backend URL before building Android.');
}
if (!process.env.VITE_GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com')) {
  console.warn('Warning: VITE_GOOGLE_CLIENT_ID (the Web OAuth client ID) is not set; "Continue with Google" will not work in this build.');
}
if (mode !== 'debug') {
  for (const key of ['MWANGA_KEYSTORE_PATH', 'MWANGA_KEYSTORE_PASSWORD', 'MWANGA_KEY_ALIAS', 'MWANGA_KEY_PASSWORD']) {
    if (!process.env[key]) throw new Error(`Missing signing configuration: ${key}`);
  }
}
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('npm', ['run', 'build']);
run('npx', ['cap', 'sync', 'android']);
run(process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew', [mode === 'bundle' ? 'bundleRelease' : mode === 'release' ? 'assembleRelease' : 'assembleDebug'], 'android');
