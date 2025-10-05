import { useTranslation } from 'react-i18next';
import Hero from '../components/Hero';
import Countdown from '../components/Countdown';
import DetailsSection from '../components/DetailsSection';
import MapSection from '../components/MapSection';
import RSVPForm from '../components/RSVPForm';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <Hero />
      <Countdown />
      <DetailsSection />
      <MapSection />

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-medium mb-4">{t('form.heading')}</h2>
        <RSVPForm />
      </section>
    </div>
  );
}
