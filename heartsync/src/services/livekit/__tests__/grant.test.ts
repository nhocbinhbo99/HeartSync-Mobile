import { parseCallJoinGrant } from '../grant';

const validGrant = {
  serverUrl: 'wss://example.livekit.cloud',
  accessToken: 'synthetic-token-long-enough-for-parser',
  roomName: 'match:00000000-0000-0000-0000-000000000001',
  identity: '00000000-0000-0000-0000-000000000002',
  callType: 'video',
  expiresAt: '2026-10-30T00:05:00.000Z',
};

describe('LiveKit join grant parser', () => {
  const now = new Date('2026-10-30T00:00:00.000Z');

  it('accepts a complete short-lived server grant', () => {
    expect(parseCallJoinGrant(validGrant, now)).toEqual({ ok: true, data: validGrant });
  });

  it.each([
    { ...validGrant, serverUrl: 'http://insecure.test' },
    { ...validGrant, accessToken: 'short' },
    { ...validGrant, roomName: 'arbitrary-room' },
    { ...validGrant, callType: 'screen' },
    { ...validGrant, expiresAt: '2026-10-29T23:59:59.000Z' },
  ])('rejects invalid or expired grants: %p', (grant) => {
    expect(parseCallJoinGrant(grant, now).ok).toBe(false);
  });
});
