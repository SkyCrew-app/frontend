import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  const lang = locale ?? 'fr';
  const namespaces = ['dashboard', 'navbar', 'sidebar', 'articles', 'fleet', 'reservation', 'profile'];
  const messages = {};

  for (const ns of namespaces) {
    Object.assign(
      messages,
      (await import(`../../messages/${lang}/${ns}.json`)).default
    );
  }

  return {
    locale: lang,
    messages
  };
});
