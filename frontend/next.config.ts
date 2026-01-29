import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig = {
    turbopack: {
        root: process.cwd(),
    },
};

export default withNextIntl(nextConfig);
