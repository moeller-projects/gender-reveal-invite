import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export default function MapSection() {
  const { t } = useTranslation();
  const address = useMemo(() => {
    return (
      (import.meta.env.VITE_EVENT_ADDRESS as string | undefined) ||
      t('event.where_value')
    );
  }, [t]);

  const q = encodeURIComponent(address);
  const embedUrl = `https://www.google.com/maps?q=${q}&output=embed`;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${q}`;

  return (
    <section className="rounded-lg border bg-white overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-3">{t('map.title')}</h2>
        <p className="text-neutral-600 mb-4">{address}</p>
        <a
          className="inline-flex items-center rounded bg-neutral-900 text-white px-4 py-2"
          href={routeUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          {t('map.route_button')}
        </a>
      </div>
      <div className="aspect-[16/9] w-full">
        <iframe
          title="map"
          className="w-full h-full border-t"
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}

