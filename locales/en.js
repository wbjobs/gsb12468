// English (default language, most complete)
window.__LOCALES__ = window.__LOCALES__ || {};
window.__LOCALES__['en'] = {
  nav: {
    home: 'Home',
    products: 'Products',
    settings: 'Settings',
    about: 'About'
  },
  header: {
    title: 'i18n Fallback Demo',
    subtitle: 'Graceful degradation for missing translations & Intl APIs'
  },
  greeting: 'Hello, {name}!',
  welcome: 'Welcome back, {name}. You last signed in {time}.',
  cart: {
    items: {
      zero: 'Your cart is empty',
      one: '{count} item in your cart',
      other: '{count} items in your cart'
    },
    checkout: 'Checkout'
  },
  inbox: {
    messages: {
      one: '{count} new message',
      other: '{count} new messages'
    }
  },
  stats: {
    visitors: 'Visitors today',
    revenue: 'Revenue',
    growth: 'Growth'
  },
  footer: {
    madeWith: 'Built with vanilla JS',
    copyright: '© 2026 i18n Demo'
  },
  panel: {
    support: 'Intl Support',
    missing: 'Missing Translations',
    fallbackLog: 'Fallback Log',
    plural: 'Plural Rules',
    format: 'Date / Number / Relative Time'
  }
};
