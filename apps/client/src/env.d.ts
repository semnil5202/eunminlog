/// <reference types="astro/client" />

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    gtag: (...arguments_: unknown[]) => void;
  }
}

export {};
