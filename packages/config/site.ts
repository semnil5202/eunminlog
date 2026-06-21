export const SITE_NAME_KO = '은민로그';
export const SITE_NAME_EN = 'eunminlog';
export const SITE_URL = 'https://eunminlog.site';
export const GA_MEASUREMENT_ID = 'G-QX8XPFX6YK';

type Stage = 'production' | 'development';

const SITE_URL_MAP: Record<Stage, string> = {
  production: 'https://eunminlog.site',
  development: 'https://dev.eunminlog.site',
};

export const getSiteUrlFromEnv = (stage?: string): string => {
  const key = (stage || 'production') as Stage;
  return SITE_URL_MAP[key] ?? SITE_URL_MAP.production;
};
