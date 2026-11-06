const { execFileSync } = require('child_process');
const path = require('path');

// Runs the real logger in a child process, as production does (JSON output).
function logLine(payload) {
  const script = `require(${JSON.stringify(path.join(__dirname, '../utils/logger'))}).info(${JSON.stringify(payload)}, 'test')`;
  const out = execFileSync(process.execPath, ['-e', script], { env: { ...process.env, NODE_ENV: 'production' } }).toString();
  return JSON.parse(out.trim().split('\n').pop());
}

test('production logs are JSON and never contain secrets', () => {
  const line = logLine({
    req: { headers: { authorization: 'Bearer secret-jwt', cookie: 'sid=1' }, body: { password: 'p', apiKey: 'sk-or-1' } },
    apiKey: 'sk-live', user: { password: 'x', token: 't', name: 'Ana' }, refresh_token: 'r',
  });
  const text = JSON.stringify(line);
  for (const secret of ['secret-jwt', 'sid=1', 'sk-or-1', 'sk-live', '"x"', '"t"', '"r"']) expect(text).not.toContain(secret);
  expect(line.user.name).toBe('Ana');
  expect(line.service).toBe('mwanga-api');
});
