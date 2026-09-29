/*
 * locales.js — 内置词典。en 为默认语言（完整），其余语言故意缺失部分 key，
 * 用于演示回退链：当前语言 → 默认语言(en) → key 本身。
 * 同时暴露给主线程与 Web Worker（importScripts）。
 */
(function (root) {
  'use strict';

  var LOCALE_DATA = {
    en: {
      meta: { name: 'English', dir: 'ltr' },
      nav: {
        title: 'i18n Demo',
        home: 'Home',
        about: 'About',
        settings: 'Settings'
      },
      greeting: {
        hello: 'Hello, {name}!',
        welcome: 'Welcome to the {app} demo.'
      },
      inbox: {
        messages: '{count, plural, =0{No messages} one{# message} other{# messages}}'
      },
      cart: {
        items: '{count, plural, =0{Your cart is empty} one{# item in your cart} other{# items in your cart}}'
      },
      demo: {
        paragraph: 'This paragraph demonstrates nested keys, interpolation and pluralization across languages.',
        tip: 'Tip: this sentence only exists in English, other languages fall back to it.'
      },
      footer: {
        copyright: '© 2026 i18n Demo. All rights reserved.'
      },
      fmt: {
        units: {
          second: '{count, plural, one{second} other{seconds}}',
          minute: '{count, plural, one{minute} other{minutes}}',
          hour: '{count, plural, one{hour} other{hours}}',
          day: '{count, plural, one{day} other{days}}'
        },
        relative: {
          past: '{value} {unit} ago',
          future: 'in {value} {unit}'
        }
      }
    },

    'zh-CN': {
      meta: { name: '简体中文', dir: 'ltr' },
      nav: {
        title: '多语言演示',
        home: '首页',
        about: '关于'
        // 缺失 nav.settings → 回退到 en
      },
      greeting: {
        hello: '你好，{name}！',
        welcome: '欢迎使用 {app} 演示。'
      },
      inbox: {
        messages: '{count, plural, =0{没有消息} other{# 条消息}}'
      },
      cart: {
        items: '{count, plural, =0{购物车是空的} other{购物车里有 # 件商品}}'
      },
      demo: {
        paragraph: '这段文字演示嵌套 key、变量插值和复数在不同语言下的表现。'
        // 缺失 demo.tip → 回退到 en
      },
      footer: {
        copyright: '© 2026 多语言演示。保留所有权利。'
      },
      fmt: {
        units: {
          second: '{count, plural, other{秒}}',
          minute: '{count, plural, other{分钟}}',
          hour: '{count, plural, other{小时}}',
          day: '{count, plural, other{天}}'
        },
        relative: {
          past: '{value}{unit}前',
          future: '{value}{unit}后'
        }
      }
    },

    ja: {
      meta: { name: '日本語', dir: 'ltr' },
      nav: {
        title: 'i18n デモ',
        home: 'ホーム',
        about: '概要'
        // 缺失 nav.settings → 回退到 en
      },
      greeting: {
        hello: 'こんにちは、{name}さん！',
        welcome: '{app} デモへようこそ。'
      },
      inbox: {
        messages: '{count, plural, =0{メッセージはありません} other{# 件のメッセージ}}'
      },
      cart: {
        items: '{count, plural, =0{カートは空です} other{カートに # 点の商品があります}}'
      },
      demo: {
        paragraph: 'この段落は、ネストされたキー、補間、複数形のデモです。'
        // 缺失 demo.tip → 回退到 en
      },
      // 缺失 footer 整个节点 → 回退到 en
      fmt: {
        units: {
          second: '{count, plural, other{秒}}',
          minute: '{count, plural, other{分}}',
          hour: '{count, plural, other{時間}}',
          day: '{count, plural, other{日}}'
        },
        relative: {
          past: '{value}{unit}前',
          future: '{value}{unit}後'
        }
      }
    },

    fr: {
      meta: { name: 'Français', dir: 'ltr' },
      nav: {
        title: 'Démo i18n',
        home: 'Accueil',
        about: 'À propos',
        settings: 'Paramètres'
      },
      greeting: {
        hello: 'Bonjour, {name} !',
        welcome: 'Bienvenue dans la démo {app}.'
      },
      inbox: {
        messages: '{count, plural, =0{Aucun message} one{# message} other{# messages}}'
      },
      cart: {
        items: '{count, plural, =0{Votre panier est vide} one{# article dans votre panier} other{# articles dans votre panier}}'
      },
      demo: {
        paragraph: 'Ce paragraphe illustre les clés imbriquées, l’interpolation et le pluriel.'
        // 缺失 demo.tip → 回退到 en
      },
      footer: {
        copyright: '© 2026 Démo i18n. Tous droits réservés.'
      },
      fmt: {
        units: {
          second: '{count, plural, one{seconde} other{secondes}}',
          minute: '{count, plural, one{minute} other{minutes}}',
          hour: '{count, plural, one{heure} other{heures}}',
          day: '{count, plural, one{jour} other{jours}}'
        },
        relative: {
          past: 'il y a {value} {unit}',
          future: 'dans {value} {unit}'
        }
      }
    },

    ru: {
      meta: { name: 'Русский', dir: 'ltr' },
      nav: {
        title: 'Демо i18n',
        home: 'Главная',
        about: 'О нас'
        // 缺失 nav.settings → 回退到 en
      },
      greeting: {
        hello: 'Здравствуйте, {name}!',
        welcome: 'Добро пожаловать в демо {app}.'
      },
      inbox: {
        messages: '{count, plural, =0{Нет сообщений} one{# сообщение} few{# сообщения} many{# сообщений} other{# сообщения}}'
      },
      cart: {
        items: '{count, plural, =0{Корзина пуста} one{# товар в корзине} few{# товара в корзине} many{# товаров в корзине} other{# товара в корзине}}'
      },
      demo: {
        paragraph: 'Этот абзац демонстрирует вложенные ключи, интерполяцию и множественные числа.'
        // 缺失 demo.tip → 回退到 en
      },
      // 缺失 footer 整个节点 → 回退到 en
      fmt: {
        units: {
          second: '{count, plural, one{секунда} few{секунды} many{секунд} other{секунды}}',
          minute: '{count, plural, one{минута} few{минуты} many{минут} other{минуты}}',
          hour: '{count, plural, one{час} few{часа} many{часов} other{часа}}',
          day: '{count, plural, one{день} few{дня} many{дней} other{дня}}'
        },
        relative: {
          past: '{value} {unit} назад',
          future: 'через {value} {unit}'
        }
      }
    },

    ar: {
      meta: { name: 'العربية', dir: 'rtl' },
      nav: {
        title: 'عرض i18n',
        home: 'الرئيسية',
        about: 'حول'
        // 缺失 nav.settings → 回退到 en
      },
      greeting: {
        hello: 'مرحبًا، {name}!',
        welcome: 'مرحبًا بك في عرض {app}.'
      },
      inbox: {
        messages: '{count, plural, zero{لا رسائل} one{رسالة واحدة} two{رسالتان} few{# رسائل} many{# رسالة} other{# رسالة}}'
      },
      cart: {
        items: '{count, plural, zero{سلة التسوق فارغة} one{منتج واحد في السلة} two{منتجان في السلة} few{# منتجات في السلة} many{# منتجًا في السلة} other{# منتج في السلة}}'
      },
      demo: {
        paragraph: 'توضح هذه الفقرة المفاتيح المتداخلة والاستيفاء وصيغ الجمع.'
        // 缺失 demo.tip → 回退到 en
      },
      // 缺失 footer 整个节点 → 回退到 en
      fmt: {
        units: {
          second: '{count, plural, one{ثانية} two{ثانيتين} few{ثوانٍ} many{ثانية} other{ثانية}}',
          minute: '{count, plural, one{دقيقة} two{دقيقتين} few{دقائق} many{دقيقة} other{دقيقة}}',
          hour: '{count, plural, one{ساعة} two{ساعتين} few{ساعات} many{ساعة} other{ساعة}}',
          day: '{count, plural, one{يوم} two{يومين} few{أيام} many{يومًا} other{يوم}}'
        },
        relative: {
          past: 'منذ {value} {unit}',
          future: 'بعد {value} {unit}'
        }
      }
    }
  };

  root.LOCALE_DATA = LOCALE_DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = LOCALE_DATA;
})(typeof self !== 'undefined' ? self : globalThis);
