import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com"],
  },
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr'
  }
}

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
