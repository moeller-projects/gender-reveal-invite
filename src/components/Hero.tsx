import { useTranslation } from 'react-i18next';
import { isValid, parseISO, format } from 'date-fns';
import { enUS, de as deLocale } from 'date-fns/locale';

export default function Hero() {
  const { t, i18n } = useTranslation();
  const img = (import.meta.env.VITE_COUPLE_IMAGE_URL as string | undefined) ?? '/couple.jpeg';

  const whenFormatted = (() => {
    const raw = import.meta.env.VITE_EVENT_DATETIME as string | undefined;
    if (!raw) return null;
    const date = parseISO(raw);
    if (!isValid(date)) return null;
    try {
      const locale = (i18n.language || 'en').startsWith('de') ? deLocale : enUS;
      const pattern = t('event.when_format');
      return format(date, pattern, { locale });
    } catch {
      return null;
    }
  })();

  return (
    <section className="rounded-lg border bg-white p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center">
      <img
        src={img}
        alt={t('hero.image_alt')}
        className="w-full sm:w-1/2 max-w-md rounded-lg border object-cover aspect-[1/1]"
      />
      <div className="flex-1">
        <h1 className="text-3xl font-semibold mb-2">{t('title')}</h1>
        <p className="text-neutral-700 mb-4">{t('hero.intro')}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-neutral-500">{t('event.when')}</div>
            <div className="font-medium">{whenFormatted ?? t('event.when_value')}</div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">{t('event.where')}</div>
            <div className="font-medium">{t('event.where_value')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
