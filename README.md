# Welcome!
this is a unofficial wiki for learning how to mod beat saber.
# [View Here](https://wiki.sm0ke.org/)

## Development checks

Use Node.js 20 or newer, then run:

```sh
npm ci
npm run check
```

`npm test` runs isolated SQLite-backed worker regressions and browser-DOM tests
against the checked-in UI scripts. Tests use synthetic conversations and mocked
services, and do not require production credentials. `npm run docs:check` builds
VitePress and verifies sitemap coverage, canonical metadata, public-page
reachability, and generated section links (including troubleshooting flow and
legacy bookmark destinations).

Pull requests run the same checks. The Pages deployment workflow also requires
these checks to pass before uploading the site. The support Worker and its D1
migrations are deployed separately from GitHub Pages.
