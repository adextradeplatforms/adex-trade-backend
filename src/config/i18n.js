import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let i18nInstance;

export async function initI18n() {
  if (i18nInstance) return i18nInstance;

  i18nInstance = i18next;

  await i18nInstance
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
      debug: false,
      returnObjects: true
    });

  return i18nInstance;
}

// Helper to get fixed T function
export async function getT(language) {
  const i18n = await initI18n();
  return i18n.getFixedT(language);
}

// Optional default export
export default i18next;
