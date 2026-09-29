// Français（clés manquantes volontaires : stats.visitors, footer.madeWith, cart.items.zero）
window.__LOCALES__ = window.__LOCALES__ || {};
window.__LOCALES__['fr'] = {
  nav: {
    home: 'Accueil',
    products: 'Produits',
    settings: 'Paramètres',
    about: 'À propos'
  },
  header: {
    title: 'Démo de repli i18n',
    subtitle: 'Dégradation élégante pour traductions manquantes et API Intl'
  },
  greeting: 'Bonjour, {name} !',
  welcome: 'Bon retour, {name}. Dernière connexion : {time}.',
  cart: {
    items: {
      // one / zero: manquants → repli sur la catégorie « other » de la même langue
      other: '{count} articles dans votre panier'
    },
    checkout: 'Commander'
  },
  inbox: {
    messages: {
      one: '{count} nouveau message',
      other: '{count} nouveaux messages'
    }
  },
  stats: {
    // visitors: manquant → repli
    revenue: 'Revenus',
    growth: 'Croissance'
  },
  footer: {
    // madeWith: manquant → repli
    copyright: '© 2026 Démo i18n'
  },
  panel: {
    support: 'Prise en charge Intl',
    missing: 'Traductions manquantes',
    fallbackLog: 'Journal de repli',
    plural: 'Règles de pluriel',
    format: 'Date / Nombre / Temps relatif'
  }
};
