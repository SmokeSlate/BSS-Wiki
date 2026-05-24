import DefaultTheme from 'vitepress/theme'
import { h } from 'vue' // 1. Import the h function
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h('div', { class: 'sidebar-top-logo' }, [
        // Standard HTML hyperlink tag avoids compilation errors
        h('a', { href: '/' }, [
          h('img', { 
            src: '/assets/logo.png', // Check your exact file name matches this
            alt: 'Sidebar Logo'
          })
        ])
      ])
    })
  }
}