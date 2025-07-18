import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SupportedLanguage {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserLanguagePreference {
  id: string;
  userId: string;
  languageCode: string;
  createdAt: string;
  updatedAt: string;
}

export class LanguageService {
  private static instance: LanguageService;

  private constructor() {}

  public static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  /**
   * Get all supported languages
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    const languages = await prisma.supportedLanguage.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return languages.map(lang => this.formatSupportedLanguage(lang));
  }

  /**
   * Get user's language preference
   */
  async getUserLanguagePreference(userId: string): Promise<UserLanguagePreference | null> {
    const preference = await prisma.userLanguagePreference.findUnique({
      where: { userId }
    });

    if (!preference) return null;

    return this.formatUserLanguagePreference(preference);
  }

  /**
   * Set user's language preference
   */
  async setUserLanguagePreference(userId: string, languageCode: string): Promise<UserLanguagePreference> {
    // Verify the language code exists and is active
    const language = await prisma.supportedLanguage.findFirst({
      where: { 
        code: languageCode,
        isActive: true 
      }
    });

    if (!language) {
      throw new Error(`Language code '${languageCode}' is not supported`);
    }

    const preference = await prisma.userLanguagePreference.upsert({
      where: { userId },
      update: { languageCode },
      create: { userId, languageCode }
    });

    return this.formatUserLanguagePreference(preference);
  }

  /**
   * Detect language from browser Accept-Language header
   */
  detectLanguageFromHeader(acceptLanguageHeader?: string): string {
    if (!acceptLanguageHeader) {
      return 'en'; // Default to English
    }

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
    const languages = acceptLanguageHeader
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(), // Extract primary language code
          quality: qValue ? parseFloat(qValue) : 1.0
        };
      })
      .sort((a, b) => b.quality - a.quality); // Sort by quality (preference)

    // Return the first supported language, or default to English
    const supportedCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
    
    for (const lang of languages) {
      if (supportedCodes.includes(lang.code)) {
        return lang.code;
      }
    }

    return 'en'; // Default fallback
  }

  /**
   * Detect language from text content using simple heuristics
   */
  async detectContentLanguage(text: string): Promise<string> {
    // Simple language detection based on common words/patterns
    // In a production app, you'd use a proper language detection library
    
    const lowerText = text.toLowerCase();
    
    // Spanish indicators
    if (lowerText.match(/\b(el|la|los|las|de|en|un|una|que|es|por|para|con|se|me|te|le|nos|os|les)\b/g)) {
      return 'es';
    }
    
    // French indicators
    if (lowerText.match(/\b(le|la|les|de|du|des|un|une|et|est|dans|pour|avec|sur|par|ce|cette|ces|je|tu|il|elle|nous|vous|ils|elles)\b/g)) {
      return 'fr';
    }
    
    // German indicators
    if (lowerText.match(/\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|und|ist|in|zu|mit|auf|für|von|bei|ich|du|er|sie|es|wir|ihr)\b/g)) {
      return 'de';
    }
    
    // Italian indicators
    if (lowerText.match(/\b(il|la|lo|gli|le|di|da|in|con|su|per|tra|fra|a|e|che|non|un|una|io|tu|lui|lei|noi|voi|loro)\b/g)) {
      return 'it';
    }
    
    // Portuguese indicators
    if (lowerText.match(/\b(o|a|os|as|de|da|do|das|dos|em|para|por|com|que|não|um|uma|eu|tu|ele|ela|nós|vós|eles|elas)\b/g)) {
      return 'pt';
    }
    
    // Default to English
    return 'en';
  }

  /**
   * Get language name by code
   */
  async getLanguageName(code: string): Promise<string> {
    const language = await prisma.supportedLanguage.findUnique({
      where: { code }
    });

    return language?.name || 'Unknown';
  }

  /**
   * Initialize default supported languages
   */
  async initializeDefaultLanguages(): Promise<void> {
    const defaultLanguages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' }
    ];

    for (const lang of defaultLanguages) {
      await prisma.supportedLanguage.upsert({
        where: { code: lang.code },
        update: { 
          name: lang.name, 
          nativeName: lang.nativeName,
          isActive: true 
        },
        create: {
          code: lang.code,
          name: lang.name,
          nativeName: lang.nativeName,
          isActive: true
        }
      });
    }
  }

  /**
   * Format supported language for API response
   */
  private formatSupportedLanguage(language: any): SupportedLanguage {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      isActive: language.isActive,
      createdAt: language.createdAt.toISOString()
    };
  }

  /**
   * Format user language preference for API response
   */
  private formatUserLanguagePreference(preference: any): UserLanguagePreference {
    return {
      id: preference.id,
      userId: preference.userId,
      languageCode: preference.languageCode,
      createdAt: preference.createdAt.toISOString(),
      updatedAt: preference.updatedAt.toISOString()
    };
  }
}