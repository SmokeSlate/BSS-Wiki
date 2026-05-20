import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Beat Saber Modding Wiki',
  description: 'Learn how to mod Beat Saber on Quest and PC — MBF Launcher, custom songs, custom sabers, and more.',
  lang: 'en-US',

  // Build from docs/, output to docs/.vitepress/dist/
  srcDir: '.',
  outDir: '../dist',

  // Don't include standalone app pages or Docsify-specific files in the build
  srcExclude: ['support.md', '_sidebar.md'],

  // Ignore dead links for binary files in public/ and the standalone support app
  ignoreDeadLinks: [
    /\/modPacks\//,
    /\/support/,
  ],

  head: [
    ['link', { rel: 'icon', href: '/assets/logo.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    // Tailwind CDN for the home page cards/buttons
    ['script', { src: '//cdn.tailwindcss.com' }],
    // SEO
    ['meta', { name: 'keywords', content: 'modding, beat saber, meta, oculus, quest 3, quest 2, quest 3s, wiki, tutorial, vr, game, custom, maps, custom sabers, custom maps, mods, standalone, no pc, pc, MBF, MBF Tools' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { name: 'author', content: 'Sm0ke' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://wiki.sm0ke.org/' }],
    ['meta', { property: 'og:image', content: 'https://wiki.sm0ke.org/assets/logo.png' }],
    ['meta', { property: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'twitter:image', content: 'https://wiki.sm0ke.org/assets/logo.png' }],
    // Google Analytics
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-NDRRR0YEW9' }],
    ['script', {}, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-NDRRR0YEW9');`],
  ],

  themeConfig: {
    logo: '/assets/logo.png',
    siteTitle: 'BSS Wiki',

    nav: [
      { text: 'Quest', link: '/preQuest' },
      { text: 'PC', link: '/prePC' },
      { text: 'FAQ', link: '/faq' },
      { text: 'Support Chat', link: '/support/' },
      { text: 'Discord', link: 'https://d.sm0ke.org' },
    ],

    sidebar: [
      {
        text: 'Preparations',
        items: [
          { text: 'Quest', link: '/preQuest' },
          { text: 'PC', link: '/prePC' },
        ],
      },
      {
        text: 'Quest Modding',
        link: '/quest',
        items: [
          { text: 'Mods Before Friday', link: '/quest#mods-before-friday' },
          { text: 'MBF Launcher', link: '/quest#mbf-launcher' },
          { text: 'MBF Tools App', link: '/mbftools' },
          { text: 'Recommended Mods', link: '/modsQuest' },
        ],
      },
      {
        text: 'PC Modding',
        link: '/pc',
        items: [
          { text: 'BSManager', link: '/pc#bsmanager' },
          { text: 'Recommended Mods', link: '/modsPC' },
        ],
      },
      {
        text: 'Support',
        items: [
          { text: 'FAQ', link: '/faq' },
          { text: 'Support Chat', link: '/support/' },
          { text: 'Discord', link: 'https://d.sm0ke.org' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/SmokeSlate/BSS-Wiki' },
    ],

    editLink: {
      pattern: 'https://github.com/SmokeSlate/BSS-Wiki/edit/main/docs/:path',
      text: '📝 Edit Document',
    },

    search: {
      provider: 'local',
      options: {
        placeholder: 'Search the wiki',
      },
    },

    footer: {
      message: 'Not affiliated with Meta or Beat Games.',
      copyright: 'Made by <a href="https://wiki.sm0ke.org" target="_blank">Sm0ke</a>',
    },
  },

  sitemap: {
    hostname: 'https://wiki.sm0ke.org',
  },
})
