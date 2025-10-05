import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const { t } = useTranslation();

  const linkBaseClasses =
    'inline-flex items-center gap-2 rounded px-3 py-1.5 border text-sm font-medium transition-colors';

  return (
    <div className="min-h-full bg-neutral-50 text-neutral-900">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold">{t('title')}</h1>
            <p className="text-neutral-600">{t('subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <nav className="flex items-center gap-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `${linkBaseClasses} ${
                    isActive
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-300 text-neutral-800 hover:bg-neutral-100'
                  }`
                }
                end
              >
                {t('nav.home')}
              </NavLink>
              <NavLink
                to="/wishlist"
                className={({ isActive }) =>
                  `${linkBaseClasses} ${
                    isActive
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-300 text-neutral-800 hover:bg-neutral-100'
                  }`
                }
              >
                {t('nav.wishlist')}
              </NavLink>
            </nav>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default App;
