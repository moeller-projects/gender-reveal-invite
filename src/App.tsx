import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import RSVPForm from './components/RSVPForm';
import Hero from './components/Hero';
import Countdown from './components/Countdown';
import MapSection from './components/MapSection';
import DetailsSection from './components/DetailsSection';

function App() {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-neutral-50 text-neutral-900">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-semibold">{t('title')}</h1>
            <p className="text-neutral-600">{t('subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </header>

        <Hero />
        <Countdown />
        <DetailsSection />
        <MapSection />

        <section className="rounded-lg border bg-white p-6">
          <h2 className="text-xl font-medium mb-4">{t('form.heading')}</h2>
          <RSVPForm />
        </section>
      </div>
    </div>
  );
}

export default App;
