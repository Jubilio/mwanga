jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));

const webpush = require('web-push');
const { sendRawPush } = require('../services/push.service');

describe('sendRawPush', () => {
  it('reports native (old FCM) subscriptions as gone without sending', async () => {
    const result = await sendRawPush({ title: 't' }, { device_type: 'native', endpoint: 'fcm-token' });
    expect(result).toEqual({ success: false, statusCode: 410, message: 'native_push_unsupported' });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('treats android platform rows as native', async () => {
    const result = await sendRawPush({ title: 't' }, { platform: 'android', endpoint: 'fcm-token' });
    expect(result.statusCode).toBe(410);
  });
});
