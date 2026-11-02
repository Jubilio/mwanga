jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../services/notificationSchema.service', () => ({
  getNotificationSchema: jest.fn(async () => ({ hasPushSubscriptionsTable: true, hasNotificationColumn: () => false })),
}));
jest.mock('../services/push.service', () => ({
  sendPushNotification: jest.fn(), getVapidKeys: jest.fn(() => ({})), hasPushCredentials: jest.fn(), hasNativePushCredentials: jest.fn(),
}));
jest.mock('../services/behaviorTracking.service', () => ({ trackBehaviorEvent: jest.fn() }));

const { db } = require('../config/db');
const { upsertPushSubscription } = require('../services/notification.service');

beforeEach(() => db.execute.mockReset().mockResolvedValue({ rows: [{ id: 1 }] }));

test('saves a native FCM token with empty Web Push keys (columns are NOT NULL)', async () => {
  await upsertPushSubscription({ householdId: 1, userId: 2, subscription: { endpoint: 'fcm-token', isNative: true }, deviceType: 'native', platform: 'android' });
  const { args } = db.execute.mock.calls[0][0];
  expect(args.slice(2, 5)).toEqual(['fcm-token', '', '']);
});

test('rejects a web subscription without keys with a 400', async () => {
  await expect(upsertPushSubscription({ householdId: 1, userId: 2, subscription: { endpoint: 'https://push' } }))
    .rejects.toMatchObject({ statusCode: 400 });
  expect(db.execute).not.toHaveBeenCalled();
});

test('keeps web keys as sent', async () => {
  await upsertPushSubscription({ householdId: 1, userId: 2, subscription: { endpoint: 'https://push', keys: { p256dh: 'p', auth: 'a' } } });
  expect(db.execute.mock.calls[0][0].args.slice(2, 5)).toEqual(['https://push', 'p', 'a']);
});
