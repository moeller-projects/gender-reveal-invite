import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const change = (lng: 'en' | 'de') => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-neutral-500">{t('language.label')}:</span>
      <button
        type="button"
        onClick={() => change('en')}
        className={`px-2 py-1 rounded border ${i18n.resolvedLanguage === 'en' ? 'bg-neutral-900 text-white border-neutral-800' : 'border-neutral-300'}`}
      >
        {t('language.en')}
      </button>
      <button
        type="button"
        onClick={() => change('de')}
        className={`px-2 py-1 rounded border ${i18n.resolvedLanguage === 'de' ? 'bg-neutral-900 text-white border-neutral-800' : 'border-neutral-300'}`}
      >
        {t('language.de')}
      </button>
    </div>
  );
}

