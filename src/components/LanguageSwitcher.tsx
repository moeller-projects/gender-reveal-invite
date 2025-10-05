import { useTranslation } from 'react-i18next';

const OPTIONS: Array<{ code: 'en' | 'de'; shortLabel: string }> = [
  { code: 'en', shortLabel: 'EN' },
  { code: 'de', shortLabel: 'DE' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChange = (lng: 'en' | 'de') => {
    if (i18n.resolvedLanguage !== lng) {
      i18n.changeLanguage(lng);
    }
  };

  return (
    <div className="flex justify-end">
      <div className="inline-flex overflow-hidden rounded-full border border-neutral-300 bg-white text-xs font-medium shadow-sm">
        {OPTIONS.map(({ code, shortLabel }) => {
          const isActive = i18n.resolvedLanguage === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleChange(code)}
              aria-label={t(`language.${code}`)}
              className={`px-3 py-1 transition-colors ${
                isActive
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
