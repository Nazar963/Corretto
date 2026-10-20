import { ProviderForm } from '@/components/ProviderForm';
import { SitesSection } from './SitesSection';

const t = browser.i18n.getMessage;

export function App() {
  return (
    <>
      <h1>{t('options_title')}</h1>
      <p class="lead">
        {t('options_lead')}{' '}
        <a href={browser.runtime.getURL('/welcome.html')}>{t('options_openGuide')}</a>
      </p>
      <ProviderForm mode="settings" />
      <SitesSection />
      <p class="privacy">{t('options_privacy')}</p>
    </>
  );
}
