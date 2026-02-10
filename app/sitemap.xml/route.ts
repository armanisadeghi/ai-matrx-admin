import { siteConfig } from '@/config/extras/site'

export function GET() {
  const baseUrl = siteConfig.url

  const urls = [
    { loc: baseUrl, changefreq: 'weekly', priority: '1.0' },
    { loc: `${baseUrl}/login`, changefreq: 'monthly', priority: '0.9' },
    { loc: `${baseUrl}/sign-up`, changefreq: 'monthly', priority: '0.9' },
    { loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${baseUrl}/privacy-policy`, changefreq: 'yearly', priority: '0.5' },
    { loc: `${baseUrl}/appointment-reminder`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${baseUrl}/education`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${baseUrl}/canvas/discover`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/free/games/matrx-jump`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${baseUrl}/free/games/matrx-jump/character-maker`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/free/games/tic-tac-toe`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${baseUrl}/free/uuid/generator`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${baseUrl}/free/uuid/array`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/free/zip-code-heatmap`, changefreq: 'monthly', priority: '0.6' },
  ]

  const now = new Date().toISOString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
