import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import itTranslations from './locales/it.json';
import ptTranslations from './locales/pt.json';

const resources = {
  en: {
    translation: enTranslations
  },
  es: {
    translation: esTranslations
  },
  fr: {
    translation: frTranslations
  },
  de: {
    translation: deTranslations
  },
  it: {
    translation: itTranslations
  },
  pt: {
    translation: ptTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'worrybox-language',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Namespace and key separator
    keySeparator: '.',
    nsSeparator: ':',

    // React options
    react: {
      useSuspense: false,
    },
  });

export default i18n;