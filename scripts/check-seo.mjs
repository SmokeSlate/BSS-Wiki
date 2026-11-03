import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const origin = 'https://wiki.sm0ke.org'
const output = resolve('dist')
const sitemap = await readFile(resolve(output, 'sitemap.xml'), 'utf8')
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
const pages = new Map()

assert.ok(urls.length > 0, 'The sitemap must contain pages')
assert.equal(new Set(urls).size, urls.length, 'Sitemap URLs must be unique')
assert.ok(urls.includes(`${origin}/`), 'The sitemap must include the homepage')
assert.ok(urls.includes(`${origin}/fix/`), 'The sitemap must include the public troubleshooter')

// Account for every Markdown guide, including future nested guides. These are
// the same non-page sources excluded by the VitePress configuration.
const excludedSources = new Set(['support.md', '_sidebar.md'])
async function markdownPages(directory = 'docs', prefix = '') {
  const paths = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'public') continue
    const path = `${prefix}${entry.name}`
    if (entry.isDirectory()) paths.push(...await markdownPages(`${directory}/${entry.name}`, `${path}/`))
    else if (entry.name.endsWith('.md') && !excludedSources.has(path)) paths.push(path)
  }
  return paths
}
const expectedUrls = (await markdownPages()).map((path) =>
  `${origin}/${path.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '.html')}`
)
expectedUrls.push(`${origin}/fix/`)
assert.deepEqual([...urls].sort(), expectedUrls.sort(), 'Sitemap must cover every guide and the public troubleshooter')

// Check the built HTML, not just config, so changes to VitePress or metadata
// cannot silently break the canonical URLs served to crawlers.
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]))
  )
}

for (const location of urls) {
  const url = new URL(location)
  assert.equal(url.origin, origin, `Wrong sitemap origin: ${location}`)
  assert.equal(url.hash + url.search, '', `Noncanonical sitemap URL: ${location}`)
  const filename = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname
  const html = await readFile(resolve(output, `.${filename}`), 'utf8')
  pages.set(location, html)
  const head = html.slice(0, html.indexOf('</head>'))
  const canonical = tags(head, 'link').filter((tag) => tag.rel === 'canonical')
  assert.deepEqual(canonical.map((tag) => tag.href), [location], `Canonical mismatch: ${location}`)
  const meta = tags(head, 'meta')
  assert.deepEqual(meta.filter((tag) => tag.property === 'og:url').map((tag) => tag.content), [location], `Open Graph URL mismatch: ${location}`)
  assert.ok(!meta.some((tag) => /^(robots|googlebot)$/i.test(tag.name ?? '') && /\bnoindex\b/i.test(tag.content)), `Sitemap page is noindex: ${location}`)
  assert.ok(/<(h1|main)\b/.test(html), `Sitemap page lacks server-rendered main content: ${location}`)
}

// Crawlers must also be able to find every sitemap page through ordinary links.
const reachable = new Set([`${origin}/`])
for (const location of reachable) {
  for (const { href } of tags(pages.get(location), 'a')) {
    if (!href) continue
    const link = new URL(href, location)
    link.hash = ''
    link.search = ''
    let target = link.href.replace(/\/index\.html$/, '/')
    if (!pages.has(target) && pages.has(`${target}.html`)) target += '.html'
    if (pages.has(target)) reachable.add(target)
  }
}
assert.deepEqual(urls.filter((url) => !reachable.has(url)), [], 'Sitemap pages must be reachable from homepage links')

const robots = await readFile(resolve(output, 'robots.txt'), 'utf8')
assert.match(robots, /^Sitemap: https:\/\/wiki\.sm0ke\.org\/sitemap\.xml\s*$/m)
const support = await readFile(resolve(output, 'support/index.html'), 'utf8')
assert.ok(tags(support, 'meta').some((tag) => tag.name === 'robots' && /\bnoindex\b/.test(tag.content)), 'Support chat must stay noindex')
assert.ok(!urls.some((url) => /\/(support|404|builder|dash)([/.]|$)/.test(new URL(url).pathname)), 'Support, error pages, and internal tools must stay out of the sitemap')

console.log(`SEO checks passed for ${urls.length} sitemap pages; support chat remains noindex.`)
