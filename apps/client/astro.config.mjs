import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import { getSiteUrlFromEnv } from '@eunminlog/config/site';

const localDomain = 'local-client.eunminlog.site';
const keyFile = new URL('./local-key.pem', import.meta.url);
const certFile = new URL('./local.pem', import.meta.url);
const hasLocalCert = fs.existsSync(keyFile) && fs.existsSync(certFile);

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
