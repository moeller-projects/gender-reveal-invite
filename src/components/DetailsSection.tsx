import { useTranslation } from 'react-i18next';
import AddToCalendar from './AddToCalendar';

export default function DetailsSection() {
  const { t } = useTranslation();
  const registryUrl = (import.meta.env.VITE_REGISTRY_URL as string | undefined) ?? '';

  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="text-xl font-medium mb-4">{t('event.details')}</h2>

      <div className="grid sm:grid-cols-3 gap-6 items-start">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-neutral-600">
            {/* Hanger icon for dress code */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2a3 3 0 0 0-3 3 1 1 0 1 0 2 0 1 1 0 1 1 2 0c0 .55-.45 1-1 1-1.657 0-3 1.343-3 3v.5a1 1 0 0 0 1 1h2.586L4.293 17.793A1 1 0 0 0 5 19.5h14a1 1 0 0 0 .707-1.707L13.414 10.5H14a1 1 0 0 0 1-1V9c0-1.306-.835-2.418-2-2.83V6a3 3 0 0 0-3-3Z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm text-neutral-500">{t('event.dresscode')}</div>
            <div className="font-medium">{t('event.dresscode_value')}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-neutral-600">
            {/* Gift icon for registry */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M20 7h-2.586A2 2 0 0 0 18 6a3 3 0 1 0-6 0 3 3 0 1 0-6 0c0 .353.06.69.172 1H4a2 2 0 0 0-2 2v2h20V9a2 2 0 0 0-2-2ZM9 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM2 13h9v9H4a2 2 0 0 1-2-2v-7Zm11 0h9v7a2 2 0 0 1-2 2h-7v-9Z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm text-neutral-500">{t('details.registry')}</div>
            {registryUrl ? (
              <a
                href={registryUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-neutral-900 underline underline-offset-4"
              >
                {t('details.open_registry')}
              </a>
            ) : (
              <div className="text-neutral-600">{t('details.no_registry')}</div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-neutral-600">
            {/* Calendar icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 8H5v10h14V10Z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm text-neutral-500">{t('details.calendar')}</div>
            <AddToCalendar />
          </div>
        </div>
      </div>
    </section>
  );
}

