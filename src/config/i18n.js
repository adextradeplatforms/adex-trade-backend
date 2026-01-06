// src/config/i18n.js
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;

export async function initI18n() {
  if (initialized) return i18next;

  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: 'en',
      preload: ['en', 'ar', 'es', 'it', 'ru'],
      ns: ['translation'],
      defaultNS: 'translation',
      backend: {
        loadPath: path.join(__dirname, '../../locales/{{lng}}/{{ns}}.json'),
      },
      detection: {
        order: ['header', 'querystring'],
        lookupHeader: 'accept-language',
        caches: false,
      },
      debug: false,
      returnObjects: true,
    });

  initialized = true;
  return i18next;
}

// Optional helper
export async function getT(language) {
  await initI18n();
  return i18next.getFixedT(language);
}

export default i18next;
