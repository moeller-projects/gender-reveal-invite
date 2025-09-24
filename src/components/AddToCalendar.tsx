import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function formatICSDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

export default function AddToCalendar() {
  const { t } = useTranslation();

  const { href, name } = useMemo(() => {
    const dtRaw = import.meta.env.VITE_EVENT_DATETIME as string | undefined;
    const address = (import.meta.env.VITE_EVENT_ADDRESS as string | undefined) ?? '';
    const title = (import.meta.env.VITE_EVENT_TITLE as string | undefined) ?? t('title');
    const desc = t('hero.intro');
    const durationMin = Number(import.meta.env.VITE_EVENT_DURATION_MINUTES ?? 120);

    if (!dtRaw) {
      return { href: '#', name: 'event.ics' };
    }
    const start = new Date(dtRaw);
    if (isNaN(start.getTime())) return { href: '#', name: 'event.ics' };
    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    const uid = `${start.getTime()}@gender-reveal-invite.local`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//gender-reveal-invite//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${desc.replace(/\n/g, ' ')}`,
      `LOCATION:${address.replace(/\n/g, ' ')}`,
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return { href: url, name: 'gender-reveal.ics' };
  }, [t]);

  const disabled = href === '#';

  return (
    <a
      href={href}
      download={name}
      onClick={(e) => disabled && e.preventDefault()}
      className={`inline-flex items-center gap-2 rounded px-4 py-2 border ${disabled ? 'opacity-60 pointer-events-none' : 'bg-neutral-900 text-white border-neutral-900'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v3H2V6a2 2 0 0 1 2-2h1V3a1 1 0 1 1 2 0v1ZM2 11h22v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7Zm6 3a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H8Z"/>
      </svg>
      {t('details.add_to_calendar')}
    </a>
  );
}

