import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'MangaFit - Comic & Webtoon Resizer',
    description: 'Easily scale and fit images or comic panels on any website.',
    version: '0.2',

    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],

    browser_specific_settings: {
      gecko: {
        data_collection_permissions: {
          required: ['none']
        }
      }
    }
  }
});