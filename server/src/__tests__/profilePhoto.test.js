jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/audit', () => ({ logAction: jest.fn() }));
jest.mock('../controllers/dashboard.controller', () => ({ invalidateDashboardCache: jest.fn() }));
const { db } = require('../config/db');
const { upsertSetting, getSettings } = require('../controllers/settings.controller');
const { validateProfilePic, withMemberPhoto, MAX_DATA_URL_LENGTH } = require('../utils/profilePhoto');

const res = () => { const response = { status: jest.fn(), json: jest.fn() }; response.status.mockReturnValue(response); return response; };
const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]).toString('base64')}`;
const png = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]).toString('base64')}`;
beforeEach(() => jest.clearAllMocks());

describe('validateProfilePic', () => {
  test('accepts small JPEG/PNG data URLs, the avatar service and clearing', () => {
    expect(validateProfilePic(jpeg)).toBe(jpeg);
    expect(validateProfilePic(png)).toBe(png);
    expect(validateProfilePic('')).toBe('');
    expect(validateProfilePic('https://ui-avatars.com/api/?name=Fam&background=20c997&color=fff&size=128')).toMatch(/^https:/);
  });
  test.each([
    ['svg', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ['html', 'data:text/html;base64,PGgxPmhpPC9oMT4='],
    ['remote url', 'https://evil.example/track.png'],
    ['javascript', 'javascript:alert(1)'],
    ['type mismatch', jpeg.replace('image/jpeg', 'image/png')],
    ['too large', `data:image/jpeg;base64,/9j/${'A'.repeat(MAX_DATA_URL_LENGTH)}`],
    ['object', { url: jpeg }],
  ])('rejects %s', (_name, value) => {
    expect(() => validateProfilePic(value)).toThrow(expect.objectContaining({ code: 'INVALID_PROFILE_PIC' }));
  });
});

test('withMemberPhoto shows only the viewer photo and hides other members', () => {
  const map = { profile_pic: 'legacy', 'profile_pic:u1': jpeg, 'profile_pic:u2': png, currency: 'MT' };
  expect(withMemberPhoto(map, 1)).toEqual({ profile_pic: jpeg, currency: 'MT' });
  expect(withMemberPhoto(map, 3)).toEqual({ profile_pic: 'legacy', currency: 'MT' });
  expect(withMemberPhoto({ 'profile_pic:u4': '' , profile_pic: 'legacy' }, 4)).toEqual({ profile_pic: '' });
});

test('upsertSetting stores the photo under the member key', async () => {
  db.execute.mockResolvedValue({ rows: [] });
  const response = res();
  await upsertSetting({ user: { id: 9, householdId: 42 }, body: { key: 'profile_pic', value: jpeg } }, response, jest.fn());
  expect(db.execute.mock.calls[0][0].args).toEqual(['profile_pic:u9', jpeg, 42, jpeg]);
  expect(response.json).toHaveBeenCalledWith({ success: true, key: 'profile_pic', value: jpeg });
});

test('upsertSetting rejects invalid photos and direct member keys', async () => {
  for (const body of [{ key: 'profile_pic', value: 'data:image/svg+xml;base64,PHN2Zz4=' }, { key: 'profile_pic:u2', value: jpeg }]) {
    const response = res();
    await upsertSetting({ user: { id: 9, householdId: 42 }, body }, response, jest.fn());
    expect(response.status).toHaveBeenCalledWith(400);
  }
  expect(db.execute).not.toHaveBeenCalled();
});

test('getSettings returns the viewer photo only', async () => {
  db.execute
    .mockResolvedValueOnce({ rows: [{ key: 'profile_pic:u9', value: jpeg }, { key: 'profile_pic:u2', value: png }, { key: 'currency', value: 'MT' }] })
    .mockResolvedValueOnce({ rows: [{ name: 'Casa', cash_balance: 0 }] });
  const response = res();
  await getSettings({ user: { id: 9, householdId: 42 } }, response, jest.fn());
  expect(response.json).toHaveBeenCalledWith({ profile_pic: jpeg, currency: 'MT', household_name: 'Casa', cash_balance: 0 });
});
