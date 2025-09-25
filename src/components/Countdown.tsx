import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { differenceInSeconds, isValid, parseISO } from 'date-fns';

function getTimeParts(target: Date) {
  const seconds = Math.max(0, differenceInSeconds(target, new Date()));
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { days, hours, minutes, seconds: secs };
}

export default function Countdown() {
  const { t } = useTranslation();
  const target = useMemo(() => {
    const raw = import.meta.env.VITE_EVENT_DATETIME as string | undefined;
    if (!raw) return null;
    const parsed = parseISO(raw);
    return isValid(parsed) ? parsed : null;
  }, []);

  const [parts, setParts] = useState(() =>
    target ? getTimeParts(target) : { days: 0, hours: 0, minutes: 0, seconds: 0 }
  );

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => {
      setParts(getTimeParts(target));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="text-neutral-600">{t('countdown.placeholder')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="text-xl font-medium mb-4 text-center">{t('countdown.title')}</h2>
      <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto">
        {[
          { label: t('countdown.days'), value: parts.days },
          { label: t('countdown.hours'), value: parts.hours },
          { label: t('countdown.minutes'), value: parts.minutes },
          { label: t('countdown.seconds'), value: parts.seconds },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-3xl sm:text-4xl font-semibold tabular-nums bg-neutral-50 rounded-md border px-3 py-4">
              {String(item.value).padStart(2, '0')}
            </div>
            <div className="text-xs mt-2 text-neutral-600 uppercase tracking-wide">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

