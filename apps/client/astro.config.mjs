import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import { getSiteUrlFromEnv } from '@eunminlog/config/site';

const localDomain = 'local-client.eunminlog.site';
const keyFile = new URL('./local-key.pem', import.meta.url);
const certFile = new URL('./local.pem', import.meta.url);
const hasLocalCert = fs.existsSync(keyFile) && fs.existsSync(certFile);

const siteUrl = getSiteUrlFromEnv(process.env.PUBLIC_STAGE);

export default defineConfig({
  site: siteUrl,
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'always',
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ko',
        locales: {
          ko: 'ko',
          en: 'en',
          ja: 'ja',
          'zh-CN': 'zh-CN',
          'zh-TW': 'zh-TW',
          id: 'id',
          vi: 'vi',
          th: 'th',
        },
      },
      filter: (page) => !page.includes('/search/'),
    }),
  ],
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'id', 'vi', 'th'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  server: {
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      ...(hasLocalCert && {
        https: {
          key: fs.readFileSync(keyFile),
          cert: fs.readFileSync(certFile),
        },
      }),
      open: `${hasLocalCert ? 'https' : 'http'}://${localDomain}:4321`,
    },
  },
});
