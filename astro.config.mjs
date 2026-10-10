// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sg57.dev',
  output: 'static',
  integrations: [sitemap()],
  // the rehndrop landing page lives in its own repo (SG57/rehndrop-site) on its own subdomain;
  // this keeps sg57.dev/rehndrop working for anyone who types it
  redirects: { '/rehndrop': 'https://rehndrop.sg57.dev/' },
});
