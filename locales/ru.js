// Русский（сложные правила множественного числа: one/few/many；намеренно пропущены nav.settings, panel.missing）
window.__LOCALES__ = window.__LOCALES__ || {};
window.__LOCALES__['ru'] = {
  nav: {
    home: 'Главная',
    products: 'Продукты',
    // settings: пропущено → откат
    about: 'О нас'
  },
  header: {
    title: 'Демо отката i18n',
    subtitle: 'Плавная деградация при отсутствии переводов и API Intl'
  },
  greeting: 'Здравствуйте, {name}!',
  welcome: 'С возвращением, {name}. Последний вход: {time}.',
  cart: {
    items: {
      one: '{count} товар в корзине',
      few: '{count} товара в корзине',
      many: '{count} товаров в корзине',
      other: '{count} товара в корзине'
    },
    checkout: 'Оформить заказ'
  },
  inbox: {
    messages: {
      one: '{count} новое сообщение',
      few: '{count} новых сообщения',
      many: '{count} новых сообщений',
      other: '{count} новых сообщения'
    }
  },
  stats: {
    visitors: 'Посетители сегодня',
    revenue: 'Доход',
    growth: 'Рост'
  },
  footer: {
    madeWith: 'Создано на vanilla JS',
    copyright: '© 2026 Демо i18n'
  },
  panel: {
    support: 'Поддержка Intl',
    // missing: пропущено → откат
    fallbackLog: 'Журнал откатов',
    plural: 'Правила множественного числа',
    format: 'Дата / Число / Относительное время'
  }
};
