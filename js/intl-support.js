/*
 * Intl 能力检测 + 降级格式化器
 * 当浏览器不支持 Intl / PluralRules / RelativeTimeFormat / DateTimeFormat / NumberFormat 时，
 * 提供行为一致的简单实现，保证 UI 不出现空白或异常。
 */
(function (global) {
  'use strict';

  function detectSupport() {
    var support = {
      intl: typeof global.Intl === 'object' && global.Intl !== null,
      pluralRules: false,
      relativeTimeFormat: false,
      dateTimeFormat: false,
      numberFormat: false
    };
    if (!support.intl) return support;
    try { support.pluralRules = typeof global.Intl.PluralRules === 'function' &&
        !!new global.Intl.PluralRules('en').select(1); } catch (e) {}
    try { support.relativeTimeFormat = typeof global.Intl.RelativeTimeFormat === 'function' &&
        !!new global.Intl.RelativeTimeFormat('en').format(-1, 'day'); } catch (e) {}
    try { support.dateTimeFormat = typeof global.Intl.DateTimeFormat === 'function' &&
        !!new global.Intl.DateTimeFormat('en').format(new Date(0)); } catch (e) {}
    try { support.numberFormat = typeof global.Intl.NumberFormat === 'function' &&
        !!new global.Intl.NumberFormat('en').format(1); } catch (e) {}
    return support;
  }

  /* ---------- 复数规则降级实现（CLDR 规则的简化版） ---------- */
  var pluralRuleFallbacks = {
    'zh': function () { return 'other'; },
    'ja': function () { return 'other'; },
    'ko': function () { return 'other'; },
    'en': function (n) { return n === 1 ? 'one' : 'other'; },
    'de': function (n) { return n === 1 ? 'one' : 'other'; },
    'fr': function (n) { return (n === 0 || n === 1) ? 'one' : 'other'; },
    'ru': function (n) {
      var mod10 = n % 10, mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
      if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
      return 'other';
    },
    'ar': function (n) {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      var mod100 = n % 100;
      if (mod100 >= 3 && mod100 <= 10) return 'few';
      if (mod100 >= 11 && mod100 <= 99) return 'many';
      return 'other';
    }
  };

  function baseLang(lang) {
    return String(lang || 'en').split('-')[0].toLowerCase();
  }

  function createPluralSelector(lang, support) {
    if (support.pluralRules) {
      try {
        var pr = new global.Intl.PluralRules(lang);
        return function (n) { return pr.select(n); };
      } catch (e) { /* fall through to manual rules */ }
    }
    var rule = pluralRuleFallbacks[baseLang(lang)] || pluralRuleFallbacks.en;
    return function (n) { return rule(Math.abs(Math.floor(Number(n) || 0))); };
  }

  /* ---------- 数字格式化降级 ---------- */
  function formatNumber(value, lang, support, options) {
    options = options || {};
    if (support.numberFormat) {
      try { return new global.Intl.NumberFormat(lang, options).format(value); } catch (e) {}
    }
    var num = Number(value);
    if (!isFinite(num)) return String(value);
    var digits = options.maximumFractionDigits != null ? options.maximumFractionDigits : 2;
    var fixed = num.toFixed(digits);
    var parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var out = parts.join('.');
    if (options.style === 'currency' && options.currency) out = options.currency + ' ' + out;
    if (options.style === 'percent') out = out + '%';
    return out;
  }

  /* ---------- 日期时间格式化降级 ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function formatDateTime(date, lang, support, options) {
    options = options || { dateStyle: 'medium', timeStyle: 'short' };
    if (support.dateTimeFormat) {
      try { return new global.Intl.DateTimeFormat(lang, options).format(date); } catch (e) {}
    }
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* ---------- 相对时间格式化降级 ---------- */
  var relativeFallbackWords = {
    'en': { past: '{n} {u} ago', future: 'in {n} {u}', units: { second: ['second', 'seconds'], minute: ['minute', 'minutes'], hour: ['hour', 'hours'], day: ['day', 'days'], week: ['week', 'weeks'], month: ['month', 'months'], year: ['year', 'years'] } },
    'zh': { past: '{n}{u}前', future: '{n}{u}后', units: { second: ['秒'], minute: ['分钟'], hour: ['小时'], day: ['天'], week: ['周'], month: ['个月'], year: ['年'] } },
    'ja': { past: '{n}{u}前', future: '{n}{u}後', units: { second: ['秒'], minute: ['分'], hour: ['時間'], day: ['日'], week: ['週間'], month: ['か月'], year: ['年'] } },
    'fr': { past: 'il y a {n} {u}', future: 'dans {n} {u}', units: { second: ['seconde', 'secondes'], minute: ['minute', 'minutes'], hour: ['heure', 'heures'], day: ['jour', 'jours'], week: ['semaine', 'semaines'], month: ['mois'], year: ['an', 'ans'] } },
    'ru': { past: '{n} {u} назад', future: 'через {n} {u}', units: { second: ['секунду', 'секунды', 'секунд'], minute: ['минуту', 'минуты', 'минут'], hour: ['час', 'часа', 'часов'], day: ['день', 'дня', 'дней'], week: ['неделю', 'недели', 'недель'], month: ['месяц', 'месяца', 'месяцев'], year: ['год', 'года', 'лет'] } }
  };

  function pickRuForm(forms, n) {
    var sel = pluralRuleFallbacks.ru(n);
    if (sel === 'one') return forms[0];
    if (sel === 'few') return forms[1];
    return forms[forms.length - 1];
  }

  function formatRelativeTime(value, unit, lang, support) {
    if (support.relativeTimeFormat) {
      try {
        return new global.Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(value, unit);
      } catch (e) {}
    }
    var table = relativeFallbackWords[baseLang(lang)] || relativeFallbackWords.en;
    var n = Math.abs(value);
    var forms = table.units[unit] || table.units.day;
    var word = forms.length === 1 ? forms[0]
      : (baseLang(lang) === 'ru' ? pickRuForm(forms, n) : forms[n === 1 ? 0 : Math.min(1, forms.length - 1)]);
    var tpl = value < 0 ? table.past : table.future;
    return tpl.replace('{n}', n).replace('{u}', word);
  }

  global.IntlSupport = {
    detect: detectSupport,
    pluralSelector: createPluralSelector,
    formatNumber: formatNumber,
    formatDateTime: formatDateTime,
    formatRelativeTime: formatRelativeTime
  };
})(window);
