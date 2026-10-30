import { transitionCallStatus } from '../callState';

describe('call state machine', () => {
  it('becomes connected only after the media-connected event', () => {
    expect(transitionCallStatus('idle', 'ring')).toEqual({ ok: true, data: 'ringing' });
    expect(transitionCallStatus('ringing', 'accept_requested')).toEqual({ ok: true, data: 'accepted' });
    expect(transitionCallStatus('accepted', 'media_connecting')).toEqual({ ok: true, data: 'connecting' });
    expect(transitionCallStatus('connecting', 'media_connected')).toEqual({ ok: true, data: 'connected' });
  });

  it('rejects optimistic or terminal-state transitions', () => {
    expect(transitionCallStatus('accepted', 'media_connected').ok).toBe(false);
    expect(transitionCallStatus('ended', 'media_connected').ok).toBe(false);
  });
});
