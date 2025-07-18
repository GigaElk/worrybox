import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { languageService, SupportedLanguage } from '../services/languageService'
import { useAuth } from '../contexts/AuthContext'
import { Globe, ChevronDown, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface LanguageSelectorProps {
  className?: string
  showLabel?: boolean
  compact?: boolean
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className = '', 
  showLabel = true,
  compact = false 
}) => {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [languages, setLanguages] = useState<SupportedLanguage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSupportedLanguages()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSupportedLanguages = async () => {
    try {
      setIsLoading(true)
      const data = await languageService.getSupportedLanguages()
      setLanguages(data)
    } catch (error) {
      console.error('Failed to load supported languages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const changeLanguage = async (languageCode: string) => {
    try {
      setIsChanging(true)
      
      // Change the i18n language immediately for UI responsiveness
      await i18n.changeLanguage(languageCode)
      
      // Save preference to backend if user is authenticated
      if (isAuthenticated) {
        try {
          await languageService.setUserLanguagePreference(languageCode)
        } catch (error) {
          console.error('Failed to save language preference:', error)
          // Don't show error to user as the language change still worked locally
        }
      }
      
      // Store in localStorage for non-authenticated users
      localStorage.setItem('worrybox-language', languageCode)
      
      toast.success(t('language.languageUpdated'))
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to change language:', error)
      toast.error(t('errors.somethingWentWrong'))
    } finally {
      setIsChanging(false)
    }
  }

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === i18n.language) || languages.find(lang => lang.code === 'en')
  }

  const currentLanguage = getCurrentLanguage()

  if (compact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || isChanging}
          className="flex items-center p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full disabled:opacity-50"
          aria-label={t('language.selectLanguage')}
        >
          {isChanging ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Globe className="w-5 h-5" />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  disabled={isChanging}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-between"
                >
                  <span>{language.nativeName}</span>
                  {i18n.language === language.code && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isChanging}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
      >
        {isChanging ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Globe className="w-4 h-4" />
        )}
        
        {showLabel && (
          <span className="hidden sm:inline">
            {isLoading ? t('common.loading') : currentLanguage?.nativeName || 'English'}
          </span>
        )}
        
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('language.selectLanguage')}
            </p>
          </div>
          
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                disabled={isChanging}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs text-gray-500">{language.name}</div>
                </div>
                {i18n.language === language.code && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
          
          {!isAuthenticated && (
            <div className="px-4 py-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {t('language.autoDetected')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector