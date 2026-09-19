// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://namejoiner.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    preact(),
    sitemap({ filter: (page) => !/\/404\/?$/.test(page) }),
  ],
  vite: { plugins: [tailwindcss()] },
});
