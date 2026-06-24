import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private, login-gated app surfaces — keep out of the index.
      disallow: [
        '/expenses',
        '/income',
        '/deductions',
        '/debts',
        '/investments',
        '/backup',
        '/settings',
        '/profile',
        '/notes',
        '/insights',
        '/subscriptions',
        '/mfa',
        '/reset-password',
        '/auth/',
        '/api/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
