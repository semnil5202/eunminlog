import type { Locale } from '@/shared/types/common';
import {
  CONSENT_REQUIRED_LOCALES,
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_MAX_AGE,
} from '@/shared/constants/consent';

export type ConsentState = 'undecided' | 'accepted' | 'rejected';

export function isConsentRequired(locale: Locale): boolean {
  return (CONSENT_REQUIRED_LOCALES as readonly string[]).includes(locale);
}

export function getConsentState(): ConsentState {
  if (typeof document === 'undefined') return 'undecided';

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!match) return 'undecided';

  const value = match.split('=')[1];
  if (value === 'true') return 'accepted';
  if (value === 'false') return 'rejected';
  return 'undecided';
}

export function setConsentCookie(accepted: boolean): void {
  const maxAge = accepted ? CONSENT_COOKIE_MAX_AGE : 60 * 60 * 24;
  document.cookie = `${CONSENT_COOKIE_NAME}=${accepted}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}
