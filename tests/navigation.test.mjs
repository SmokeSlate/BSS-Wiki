import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function redirect(hash, search = '') {
  const calls = []
  const source = await readFile('docs/public/assets/legacy-redirect.js', 'utf8')
  const location = { hash, search, origin: 'https://wiki.sm0ke.org', replace: (url) => calls.push(url) }
  vm.runInNewContext(source, { location, URL, URLSearchParams })
  return calls
}

test('legacy Docsify routes preserve and translate their section destinations', async () => {
  const cases = [
    ['#/quest?id=MBF-Launcher', '/quest.html#mbf-launcher'],
    ['#/quest?id=_5-using-dev-tools-opener-to-enable-developer-mode', '/quest.html#_4-using-dev-tools-opener-to-enable-developer-mode'],
    ['#/quest.md?id=using-dev-tools-opener-to-enable-developer-mode', '/quest.html#_4-using-dev-tools-opener-to-enable-developer-mode'],
    ['#/quest?id=mbf-browser', '/quest.html#mods-before-friday'],
    ['#/pc?id=install-custom-songs', '/pc.html#_4-install-custom-songs'],
    ['#/pc?id=4-install-custom-songs', '/pc.html#_4-install-custom-songs'],
    ['#/quest?id=_4-using-dev-tools-opener-to-enable-developer-mode', '/quest.html#_4-using-dev-tools-opener-to-enable-developer-mode'],
    ['#/faq', '/faq.html'],
    ['#/README.md', '/'],
    ['#/', '/'],
    ['#/fix/', '/fix/'],
    ['#/faq?id=Future%20Section&from=dashboard', '/faq.html?from=dashboard#future-section'],
    ['#/quest.html#mbf-launcher', '/quest.html#mbf-launcher'],
  ]
  for (const [input, expected] of cases) assert.deepEqual(await redirect(input), [expected], input)
})

test('legacy redirects retain outer query parameters but remove the old id parameter', async () => {
  assert.deepEqual(await redirect('#/quest?id=MBF-Launcher&source=legacy', '?campaign=wiki'), ['/quest.html?campaign=wiki&source=legacy#mbf-launcher'])
})

test('ordinary anchors and off-origin legacy paths never trigger navigation', async () => {
  for (const hash of ['', '#mbf-launcher', '#//example.com/path', '#/\\example.com/path']) {
    assert.deepEqual(await redirect(hash), [], hash)
  }
})
