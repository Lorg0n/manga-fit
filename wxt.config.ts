import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: "PanelFit - Smart Image Resizer",
    description: "Easily scale and fit images or comic panels on any website.",
    version: "0.1",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"]
  }
});