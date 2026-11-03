// Preserve bookmarks made before the Docsify to VitePress migration.
(function () {
  if (!location.hash || !location.hash.startsWith('#/')) return;

  var target;
  try {
    target = new URL(location.hash.slice(1), location.origin);
  } catch (_) {
    return;
  }
  // A malformed #//host bookmark must never become an open redirect.
  if (target.origin !== location.origin) return;

  var path = target.pathname;
  if (/\/(?:README|index)\.md$/i.test(path)) path = path.replace(/(?:README|index)\.md$/i, '');
  else if (/\.md$/i.test(path)) path = path.replace(/\.md$/i, '.html');
  else if (!path.endsWith('/') && !/\.[^/]+$/.test(path)) path += '.html';

  var id = target.searchParams.get('id');
  target.searchParams.delete('id');
  var anchor = id !== null ? id : target.hash.slice(1);
  anchor = anchor.trim().toLowerCase().replace(/\s+/g, '-');
  var aliases = {
    '/quest.html': {
      'mbf-browser': 'mods-before-friday',
      'using-dev-tools-opener-to-enable-developer-mode': '_4-using-dev-tools-opener-to-enable-developer-mode',
      '_5-using-dev-tools-opener-to-enable-developer-mode': '_4-using-dev-tools-opener-to-enable-developer-mode',
      '5-using-dev-tools-opener-to-enable-developer-mode': '_4-using-dev-tools-opener-to-enable-developer-mode'
    },
    '/pc.html': { 'install-custom-songs': '_4-install-custom-songs' }
  };
  if (aliases[path] && aliases[path][anchor]) anchor = aliases[path][anchor];
  else if (/^\d+-/.test(anchor)) anchor = '_' + anchor;

  var query = new URLSearchParams(location.search);
  query.delete('id');
  target.searchParams.forEach(function (value, key) { query.set(key, value); });
  target.pathname = path;
  target.search = query.toString();
  target.hash = anchor;
  location.replace(target.pathname + target.search + target.hash);
})();
