import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-neutral-50 text-neutral-900">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold">{t('title')}</h1>
            <p className="text-neutral-600">{t('subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </header>

        <main className="space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default App;
