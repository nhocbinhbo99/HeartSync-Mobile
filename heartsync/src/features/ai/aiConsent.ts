type AiConsentFeature = 'profile_bio' | 'icebreaker';

function key(feature: AiConsentFeature, userId?: string) {
  return `heartsync.ai.consent.v1.${feature}.${userId ?? 'unknown-user'}`;
}

/** Privacy notice acknowledgement is only a UX preference; server authorization never depends on it. */
export function hasAiConsent(feature: AiConsentFeature, userId?: string) {
  try {
    return globalThis.localStorage?.getItem(key(feature, userId)) === 'accepted';
  } catch {
    return false;
  }
}

export function recordAiConsent(feature: AiConsentFeature, userId?: string) {
  try {
    globalThis.localStorage?.setItem(key(feature, userId), 'accepted');
  } catch {
    // If local persistence is unavailable, show the disclosure again next time.
  }
}
