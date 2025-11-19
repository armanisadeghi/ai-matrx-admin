import { MetadataRoute } from 'next'
import { siteConfig } from '@/config/extras/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/contact',
          '/privacy-policy',
          '/appointment-reminder',
          '/education',
          '/canvas',
          '/free',
        ],
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/admin',
          '/settings',
          '/tasks',
          '/notes',
          '/files',
          '/chat',
          '/apps',
          '/workflows',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}

