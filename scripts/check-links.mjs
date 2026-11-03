import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { JSDOM } from 'jsdom'

const origin = 'https://wiki.sm0ke.org'
const output = resolve('dist')
const sitemap = await readFile(resolve(output, 'sitemap.xml'), 'utf8')
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
const cache = new Map()
let checked = 0

async function documentAt(pathname) {
  if (pathname.endsWith('/')) pathname += 'index.html'
  else if (!/\.[^/]+$/.test(pathname)) pathname += '.html'
  if (!cache.has(pathname)) {
    const html = await readFile(resolve(output, `.${pathname}`), 'utf8')
    cache.set(pathname, new JSDOM(html).window.document)
  }
  return cache.get(pathname)
}

async function check(href, source) {
  const target = new URL(href, source)
  if (target.origin !== origin || !target.hash || target.hash === '#') return
  assert.ok(!target.hash.startsWith('#/'), `Untranslated legacy link: ${href} on ${source}`)
  const id = decodeURIComponent(target.hash.slice(1))
  const document = await documentAt(target.pathname)
  assert.ok(document.getElementById(id) || document.getElementsByName(id).length, `Missing section #${id} at ${target.pathname} (linked from ${source})`)
  checked++
}

for (const page of pages) {
  const document = await documentAt(new URL(page).pathname)
  for (const link of document.querySelectorAll('a[href]')) await check(link.getAttribute('href'), page)
}

// Troubleshooting links are loaded from JSON at runtime, not generated HTML.
const flow = JSON.parse(await readFile(resolve(output, 'assets/fix-flow.json'), 'utf8'))
async function checkFlow(value) {
  if (!value || typeof value !== 'object') return
  if (typeof value.href === 'string') await check(value.href, `${origin}/fix/`)
  for (const child of Object.values(value)) await checkFlow(child)
}
await checkFlow(flow)

// Check real legacy dashboard destinations after running the shipped redirect.
const redirect = await readFile(resolve(output, 'assets/legacy-redirect.js'), 'utf8')
const dashboard = await readFile(resolve(output, 'dash/index.html'), 'utf8')
for (const [, href] of dashboard.matchAll(/href:\s*["'](\/#\/[^"']*)["']/g)) {
  const source = new URL(href, origin)
  const replacements = []
  vm.runInNewContext(redirect, {
    URL, URLSearchParams,
    location: { hash: source.hash, search: source.search, origin, replace: (value) => replacements.push(value) }
  })
  assert.equal(replacements.length, 1, `Legacy dashboard link was not translated: ${href}`)
  await check(replacements[0], `${origin}/dash/`)
}

console.log(`Section-link checks passed for ${checked} generated, flow, and legacy links.`)
