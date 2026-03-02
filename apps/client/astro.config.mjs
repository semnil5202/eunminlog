import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { getSiteUrlFromEnv } from '@eunmin-log/config/site';

export default defineConfig({
  site: getSiteUrlFromEnv(process.env.PUBLIC_STAGE),
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
