import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const runtimeScript = await readFile(new URL('../docs/public/assets/troubleshooter.js', import.meta.url), 'utf8')
const builderScript = await readFile(new URL('../docs/public/assets/troubleshooter-builder.js', import.meta.url), 'utf8')
const builderHtml = await readFile(new URL('../docs/public/builder/index.html', import.meta.url), 'utf8')

function result(label) {
  return { label, description: `${label} help`, result: { title: `${label} result`, summary: `${label} summary`, steps: [`${label} step`], links: [] }, next: null }
}

function branch(label, choices = []) {
  return { label, description: `${label} help`, result: null, next: { title: `${label} node`, question: `${label} question`, details: `${label} details`, choices } }
}

function createBuilder(t, choices) {
  const dom = new JSDOM(builderHtml, { url: 'https://wiki.example/builder/', runScripts: 'outside-only' })
  t.after(() => dom.window.close())
  const errors = []
  dom.window.addEventListener('error', event => errors.push(event.error))
  t.after(() => assert.deepEqual(errors, [], 'builder must not raise uncaught DOM errors'))
  dom.window.localStorage.setItem('bss-troubleshooter-builder-autosave', JSON.stringify({ title: 'Test flow', root: { title: 'Root', choices } }))
  dom.window.eval(runtimeScript)
  dom.window.eval(builderScript)
  const document = dom.window.document
  const read = () => JSON.parse(document.querySelector('#json-output').value)
  function drag(from, to) {
    const card = document.querySelector(`[data-drag-choice="${from.join('.')}"]`)
    const target = document.querySelector(`[data-drop-node="${to.join('.')}"]`)
    assert.ok(card, `source ${from} exists`)
    assert.ok(target, `destination ${to} exists`)
    const transfer = { setData() {} }
    for (const [element, name] of [[card, 'dragstart'], [target, 'dragover'], [target, 'drop'], [card, 'dragend']]) {
      const event = new dom.window.Event(name, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'dataTransfer', { value: transfer })
      element.dispatchEvent(event)
    }
  }
  function input(selector, value) {
    const element = document.querySelector(selector)
    assert.ok(element, `editor control ${selector} exists`)
    element.value = value
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  }
  return { dom, document, read, drag, input }
}

function assertOnlyOneDestination(choice) {
  assert.ok(!(choice.next && choice.result), `${choice.label} must not acquire both a step and result`)
  choice.next?.choices.forEach(assertOnlyOneDestination)
}

test('builder does not create a phantom result when the destination shifts into the removed root index (#12)', t => {
  const { document, read, drag, input } = createBuilder(t, [result('A'), branch('B')])
  drag([0], [1])
  assert.equal(read().root.choices.length, 1)
  assert.equal(read().root.choices[0].label, 'B')
  assert.equal(read().root.choices[0].result, null)
  assert.equal(read().root.choices[0].next.choices[0].label, 'A')
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Result 1.1')
  input('[data-result-field="title"]', 'Moved A result')
  assert.equal(read().root.choices[0].next.choices[0].result.title, 'Moved A result')
  assert.equal(read().root.choices[0].result, null)
})

test('builder rebases a result moved before a later sibling, preserving selection, history and autosave (#12)', t => {
  const { dom, document, read, drag, input } = createBuilder(t, [result('A'), branch('B', [result('B1')]), branch('C', [result('C1')])])
  const original = read()
  document.querySelector('[data-select-result="0"]').click()
  drag([0], [1])
  const moved = read()
  assert.deepEqual(moved.root.choices.map(choice => choice.label), ['B', 'C'])
  assert.deepEqual(moved.root.choices[0].next.choices.map(choice => choice.label), ['B1', 'A'])
  moved.root.choices.forEach(assertOnlyOneDestination)
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Result 1.2')
  assert.equal(document.querySelector('[data-result-field="title"]').value, 'A result')
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('bss-troubleshooter-builder-autosave')), moved)
  document.querySelector('#undo-action').click()
  assert.deepEqual(read(), original)
  document.querySelector('#redo-action').click()
  assert.deepEqual(read(), moved)
  input('[data-result-field="title"]', 'Edited moved result')
  assert.equal(read().root.choices[0].next.choices[1].result.title, 'Edited moved result')
  assert.equal(read().root.choices[1].result, null)
})

test('builder rebases nested destination paths when moving a whole branch (#12)', t => {
  const { document, read, drag, input } = createBuilder(t, [
    branch('A', [result('A1')]), branch('B', [branch('B1', [result('B1a')])]), branch('C')
  ])
  drag([0], [1, 0])
  let flow = read()
  assert.deepEqual(flow.root.choices.map(choice => choice.label), ['B', 'C'])
  assert.equal(flow.root.choices[0].next.choices[0].next.choices[1].next.title, 'A node')
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Step 1.1.2')
  input('[data-node-field="title"]', 'Moved A')
  flow = read()
  assert.equal(flow.root.choices[0].next.choices[0].next.choices[1].next.title, 'Moved A')
  assert.equal(flow.root.title, 'Root')
  flow.root.choices.forEach(assertOnlyOneDestination)
})

test('builder rebases shifts within a nested sibling array (#12)', t => {
  const { document, read, drag } = createBuilder(t, [branch('Parent', [result('A'), branch('B', [branch('Deep')]), branch('C')])])
  drag([0, 0], [0, 1, 0])
  assert.equal(read().root.choices[0].next.choices[0].next.choices[0].next.choices[0].label, 'A')
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Result 1.1.1.1')
  read().root.choices.forEach(assertOnlyOneDestination)
})

test('builder supports backwards, same-parent and ancestor moves (#12)', t => {
  const { document, read, drag } = createBuilder(t, [branch('A', [result('A1')]), result('B'), result('C')])
  drag([2], [0])
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Result 1.2')
  drag([0, 0], [0])
  assert.deepEqual(read().root.choices[0].next.choices.map(choice => choice.label), ['C', 'A1'])
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Result 1.2')
  drag([0, 1], [])
  assert.deepEqual(read().root.choices.map(choice => choice.label), ['A', 'B', 'A1'])
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Result 3')
  read().root.choices.forEach(assertOnlyOneDestination)
})

test('builder rejects self and descendant cycles without changing history or data (#12)', t => {
  const { document, read, drag } = createBuilder(t, [branch('A', [branch('A1', [result('A1a')])]), branch('B')])
  const original = read()
  drag([0], [0])
  assert.deepEqual(read(), original)
  drag([0], [0, 0])
  assert.deepEqual(read(), original)
  assert.match(document.querySelector('#builder-status').textContent, /cannot be moved/)
  assert.equal(document.querySelector('#undo-action').disabled, true)
})

test('builder resets stale selections after replacing JSON instead of editing root or creating a result (#12)', t => {
  const { dom, document, read, input } = createBuilder(t, [branch('A', [result('A1')]), branch('B')])
  document.querySelector('[data-select-result="0.0"]').click()
  const replacement = { root: { title: 'Replacement root', choices: [branch('New branch')] } }
  document.querySelector('#json-output').value = JSON.stringify(replacement)
  document.querySelector('#json-output').dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  assert.equal(document.querySelector('#selected-node-label').textContent, 'Step root')
  assert.equal(read().root.choices[0].result, null)
  document.querySelector('[data-select-node="0"]').click()
  input('[data-node-field="title"]', 'Edited replacement step')
  assert.equal(read().root.title, 'Replacement root')
  assert.equal(read().root.choices[0].next.title, 'Edited replacement step')
})

function createRuntime(t) {
  const dom = new JSDOM('<main id="runtime"></main>', { url: 'https://wiki.example/fix/', runScripts: 'outside-only' })
  t.after(() => dom.window.close())
  dom.window.eval(runtimeScript)
  return { dom, api: dom.window.Troubleshooter, container: dom.window.document.querySelector('#runtime') }
}

const authoredFlow = {
  title: 'Authored flow title',
  description: 'Flow description.',
  intro: 'Flow intro with **important guidance**.',
  supportChecklist: ['Have your version ready', 'Describe what changed'],
  quickLinks: [{ label: 'Support chat', href: '/support' }, { label: 'FAQ', href: '/faq' }],
  root: {
    title: 'Root step title', question: 'Root question?', details: 'Root **details** with a [guide](/guide).',
    choices: [{ ...branch('Next', [result('Done')]), next: { title: 'Nested title', question: 'Nested question?', details: 'Nested details.\n\nMore instructions.', choices: [result('Done')] } }]
  }
}

test('Markdown export preserves flow, node, branch and result authored content and anchors (#13)', t => {
  const { api } = createRuntime(t)
  const before = JSON.stringify(authoredFlow)
  const markdown = api.treeToMarkdown(authoredFlow)
  for (const content of [
    authoredFlow.title, authoredFlow.description, authoredFlow.intro, ...authoredFlow.supportChecklist,
    'Root step title', 'Root question?', authoredFlow.root.details, 'Next help', 'Nested title', 'Nested question?',
    authoredFlow.root.choices[0].next.details, 'Done help', 'Done result', 'Done summary', '1. Done step',
    '[Support chat](/support)', '[FAQ](/faq)', 'id="node-root"', 'id="node-1"', 'href="#node-1"', 'id="result-1-1"', 'href="#result-1-1"'
  ]) assert.ok(markdown.includes(content), `export includes ${content}`)
  assert.equal(JSON.stringify(authoredFlow), before)
  assert.ok(!markdown.includes('undefined'))
})

test('builder output and Markdown download retain edited flow and step guidance (#13)', t => {
  const { dom, document, input } = createBuilder(t, [result('Done')])
  input('[data-node-field="details"]', 'Authored **step details**.')
  document.querySelector('#select-flow').click()
  input('[data-flow-field="intro"]', 'Authored intro.')
  input('[data-flow-field="supportChecklist"]', 'Bring version\nBring screenshot')
  input('[data-flow-field="quickLinks"]', 'Ask support | /support')
  let downloaded
  dom.window.Troubleshooter.downloadText = (name, text, type) => { downloaded = { name, text, type } }
  document.querySelector('#download-md').click()
  assert.equal(downloaded.name, 'fix.md')
  assert.equal(downloaded.text, document.querySelector('#markdown-output').value)
  for (const content of ['Authored **step details**.', 'Authored intro.', 'Bring version', 'Bring screenshot', '[Ask support](/support)']) {
    assert.ok(downloaded.text.includes(content), `download includes ${content}`)
  }
})

test('Markdown export keeps unsafe resource labels readable without executable links (#13)', t => {
  const { api } = createRuntime(t)
  const markdown = api.treeToMarkdown({
    quickLinks: [{ label: 'Safe [label]', href: '/guide(path)?q=two words' }, { label: 'Blocked link', href: 'javascript:alert(1)' }],
    root: { choices: [{ label: 'Done', result: { links: [{ label: 'Unsafe result', href: 'data:text/html,danger' }] } }] }
  })
  assert.ok(markdown.includes('[Safe \\[label\\]](/guide%28path%29?q=two%20words)'))
  assert.ok(markdown.includes('Blocked link'))
  assert.ok(markdown.includes('Unsafe result'))
  assert.ok(!markdown.includes('javascript:'))
  assert.ok(!markdown.includes('data:text/html'))
})

test('runtime shows branch guidance and flow support resources throughout navigation (#14)', t => {
  const { api, container } = createRuntime(t)
  api.renderRuntime(container, authoredFlow)
  const assertSupport = () => {
    assert.match(container.textContent, /Have your version ready/)
    assert.match(container.textContent, /Describe what changed/)
    assert.equal(container.querySelector('a[href="/support"]')?.textContent, 'Support chat')
    assert.equal(container.querySelector('a[href="/faq"]')?.textContent, 'FAQ')
  }
  assert.match(container.textContent, /Flow intro/)
  assert.match(container.textContent, /Next help/)
  assertSupport()
  container.querySelector('[data-choice-index="0"]').click()
  assert.match(container.textContent, /Nested details/)
  assert.match(container.textContent, /Done help/)
  assertSupport()
  container.querySelector('[data-choice-index="0"]').click()
  assert.match(container.textContent, /Done result/)
  assertSupport()
  container.querySelector('#runtime-back').click()
  assert.match(container.textContent, /Nested title/)
  assertSupport()
  container.querySelector('#runtime-reset').click()
  assert.match(container.textContent, /Root step title/)
  assert.equal(container.querySelector('#runtime-back').disabled, true)
  assertSupport()
})

test('runtime escapes authored text and permits only safe resource URLs (#14)', t => {
  const { api, container } = createRuntime(t)
  const hostileText = '<img src=x onerror="window.injected=true">'
  const unsafeLinks = ['javascript:alert(1)', 'java\nscript:alert(2)', 'data:text/html,<script>alert(3)</script>', 'vbscript:alert(4)'].map((href, index) => ({ label: `Unsafe ${index} ${hostileText}`, href }))
  const safeLinks = [
    { label: `Support ${hostileText}`, href: '/support?subject="quoted"&topic=help' },
    { label: 'Documentation', href: 'https://example.org/docs' },
    { label: 'Email support', href: 'mailto:help@example.org' },
    { label: 'Anchor', href: '#help' }
  ]
  const flow = { title: hostileText, intro: hostileText, supportChecklist: [hostileText], quickLinks: [...safeLinks, ...unsafeLinks], root: { title: hostileText, details: hostileText, choices: [{ label: hostileText, description: hostileText, result: { title: hostileText, summary: hostileText, steps: [hostileText], links: [...safeLinks, ...unsafeLinks] } }] } }
  const assertSafe = () => {
    assert.equal(container.querySelectorAll('img, script, [onerror], [onclick]').length, 0)
    assert.ok(container.textContent.includes(hostileText))
    const links = [...container.querySelectorAll('a')]
    assert.ok(links.some(link => link.getAttribute('href') === safeLinks[0].href))
    for (const link of links) assert.ok(['http:', 'https:', 'mailto:'].includes(link.protocol), `safe protocol: ${link.href}`)
    for (const link of unsafeLinks) assert.ok(container.textContent.includes(link.label), 'unsafe links remain readable without being clickable')
  }
  api.renderRuntime(container, flow)
  assertSafe()
  container.querySelector('[data-choice-index="0"]').click()
  assertSafe()
})

test('runtime handles absent optional guidance without empty help sections (#14)', t => {
  const { api, container } = createRuntime(t)
  api.renderRuntime(container, { root: { title: 'Minimal', choices: [result('Done')] } })
  assert.match(container.textContent, /Minimal/)
  assert.equal(container.querySelector('[aria-label="Support resources"]'), null)
  container.querySelector('[data-choice-index="0"]').click()
  assert.match(container.textContent, /Done result/)
  assert.equal(container.querySelector('[aria-label="Support resources"]'), null)
})
