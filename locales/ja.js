// 日本語（nav.settings / stats.visitors を意図的に欠落させる）
window.__LOCALES__ = window.__LOCALES__ || {};
window.__LOCALES__['ja'] = {
  nav: {
    home: 'ホーム',
    products: '製品',
    about: '概要'
    // settings: 欠落 → フォールバック
  },
  header: {
    title: 'i18n フォールバックデモ',
    subtitle: '欠落した翻訳と Intl API のグレースフルデグラデーション'
  },
  greeting: 'こんにちは、{name}さん！',
  welcome: 'おかえりなさい、{name}さん。前回のログイン: {time}。',
  cart: {
    items: {
      other: 'カートに {count} 点の商品があります'
    },
    checkout: 'チェックアウト'
  },
  inbox: {
    messages: {
      other: '新着メッセージ {count} 件'
    }
  },
  stats: {
    // visitors: 欠落 → フォールバック
    revenue: '売上',
    growth: '成長率'
  },
  footer: {
    madeWith: 'Vanilla JS で構築',
    copyright: '© 2026 i18n デモ'
  },
  panel: {
    support: 'Intl サポート',
    missing: '欠落した翻訳',
    fallbackLog: 'フォールバックログ',
    plural: '複数形ルール',
    format: '日付 / 数値 / 相対時間'
  }
};
