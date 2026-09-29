/*
 * i18n-core.js — 纯逻辑核心：嵌套 key、变量插值、复数、回退链。
 * 不依赖 DOM / Intl（Intl 不可用时自动使用内置复数规则表），可在浏览器与 Node 中运行。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.I18nCore = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  /* ---------- 嵌套 key 读取 ---------- */
  function getPath(obj, path) {
    if (!obj || typeof path !== 'string') return undefined;
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /* ---------- 复数规则（Intl.PluralRules 不可用时的降级实现） ---------- */
  var FALLBACK_PLURAL_RULES = {
    default: function (n) { return n === 1 ? 'one' : 'other'; },
    en: function (n) { return n === 1 ? 'one' : 'other'; },
    zh: function () { return 'other'; },
    ja: function () { return 'other'; },
    fr: function (n) { return (n === 0 || n === 1) ? 'one' : 'other'; },
    ru: function (n) {
      var mod10 = n % 10;
      var mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
      if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
      return 'other';
    },
    ar: function (n) {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      var mod100 = n % 100;
      if (mod100 >= 3 && mod100 <= 10) return 'few';
      if (mod100 >= 11 && mod100 <= 99) return 'many';
      return 'other';
    }
  };

  var pluralRulesCache = {};

  /*
   * 选择复数类别。caps.pluralRules 为 false 时强制使用内置规则表（按语言前缀匹配），
   * 否则优先使用 Intl.PluralRules。
   */
  function selectPluralCategory(locale, count, caps) {
    var n = Math.abs(Number(count)) || 0;
    var useIntl = !caps || caps.pluralRules !== false;
    if (useIntl && typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function') {
      try {
        var cacheKey = String(locale);
        if (!pluralRulesCache[cacheKey]) {
          pluralRulesCache[cacheKey] = new Intl.PluralRules(locale);
        }
        return pluralRulesCache[cacheKey].select(n);
      } catch (e) { /* 落到内置规则 */ }
    }
    var lang = String(locale || '').split('-')[0].toLowerCase();
    var rule = FALLBACK_PLURAL_RULES[lang] || FALLBACK_PLURAL_RULES.default;
    return rule(n);
  }

  /* ---------- 消息解析：{var} 与 {count, plural, =0{...} one{...} other{...}} ---------- */
  function skipWs(msg, i) {
    while (i < msg.length && /\s/.test(msg[i])) i++;
    return i;
  }

  // 读取一对匹配花括号内的文本（支持嵌套），start 指向 '{'。
  function readBraced(msg, start) {
    var depth = 0;
    var text = '';
    for (var i = start; i < msg.length; i++) {
      var ch = msg[i];
      if (ch === '{') {
        depth++;
        if (depth > 1) text += ch;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) return { text: text, end: i + 1 };
        text += ch;
      } else {
        text += ch;
      }
    }
    return null;
  }

  function readWord(msg, i, re) {
    var word = '';
    while (i < msg.length && re.test(msg[i])) { word += msg[i]; i++; }
    return { word: word, end: i };
  }

  // 解析 plural 的选项表，i 指向 "plural," 之后的位置。
  function parsePluralOptions(msg, i) {
    var options = {};
    while (i < msg.length) {
      i = skipWs(msg, i);
      if (msg[i] === '}') return { options: options, end: i + 1 };
      var key;
      if (msg[i] === '=') {
        i++;
        var num = readWord(msg, i, /[0-9]/);
        if (!num.word) return null;
        key = '=' + num.word;
        i = num.end;
      } else {
        var cat = readWord(msg, i, /[A-Za-z]/);
        if (!cat.word) return null;
        key = cat.word;
        i = cat.end;
      }
      i = skipWs(msg, i);
      if (msg[i] !== '{') return null;
      var tpl = readBraced(msg, i);
      if (!tpl) return null;
      options[key] = tpl.text;
      i = tpl.end;
    }
    return null;
  }

  // 从 msg[start]（'{'）解析一个片段：变量或 plural。
  function parseSegment(msg, start) {
    var i = start + 1;
    var name = readWord(msg, i, /[A-Za-z0-9_.\-]/);
    if (!name.word) return null;
    i = skipWs(msg, name.end);
    if (msg[i] === '}') return { kind: 'var', name: name.word, end: i + 1 };
    if (msg[i] !== ',') return null;
    i = skipWs(msg, i + 1);
    var type = readWord(msg, i, /[A-Za-z]/);
    i = skipWs(msg, type.end);
    if (type.word !== 'plural') return null;
    if (msg[i] !== ',') return null;
    var opts = parsePluralOptions(msg, i + 1);
    if (!opts) return null;
    return { kind: 'plural', name: name.word, options: opts.options, end: opts.end };
  }

  /*
   * 渲染消息。context: { locale, caps, formatNumber }
   * - locale: 用于复数规则与数字格式化
   * - caps.pluralRules === false 时强制使用内置复数规则
   * - formatNumber(n, locale): 可选，替换复数模板中的 '#'
   */
  function formatMessage(message, vars, context) {
    if (typeof message !== 'string') return message == null ? '' : String(message);
    vars = vars || {};
    context = context || {};
    var locale = context.locale || 'en';
    var out = '';
    var i = 0;
    while (i < message.length) {
      var ch = message[i];
      if (ch !== '{') { out += ch; i++; continue; }
      var seg = parseSegment(message, i);
      if (!seg) { out += ch; i++; continue; }
      if (seg.kind === 'var') {
        var v = getPath(vars, seg.name);
        out += (v === undefined || v === null) ? '{' + seg.name + '}' : String(v);
      } else {
        out += renderPlural(seg, vars, locale, context);
      }
      i = seg.end;
    }
    return out;
  }

  function renderPlural(seg, vars, locale, context) {
    var count = Number(getPath(vars, seg.name));
    if (!isFinite(count)) count = 0;
    var template;
    var exact = seg.options['=' + count];
    if (exact !== undefined) {
      template = exact;
    } else {
      var category = selectPluralCategory(locale, count, context.caps);
      if (seg.options[category] !== undefined) template = seg.options[category];
      else if (seg.options.other !== undefined) template = seg.options.other;
      else template = '';
    }
    var formatted = context.formatNumber
      ? context.formatNumber(count, locale)
      : String(count);
    var replaced = template.split('#').join(formatted);
    return formatMessage(replaced, vars, context); // 模板内可继续嵌套变量
  }

  /* ---------- 翻译器：回退链 当前语言 → 默认语言 → key 本身 ---------- */
  function createTranslator(options) {
    options = options || {};
    var locales = options.locales || {};
    var defaultLocale = options.defaultLocale || 'en';
    var currentLocale = options.locale || defaultLocale;
    var listeners = { fallback: [], missing: [] };

    function emit(type, event) {
      listeners[type].forEach(function (fn) {
        try { fn(event); } catch (e) { /* 监听器异常不影响翻译 */ }
      });
    }

    function resolve(key) {
      var chain = currentLocale === defaultLocale
        ? [currentLocale]
        : [currentLocale, defaultLocale];
      for (var i = 0; i < chain.length; i++) {
        var loc = chain[i];
        var dict = locales[loc];
        var value = dict && getPath(dict, key);
        if (value !== undefined && value !== null) {
          if (loc !== currentLocale) {
            emit('fallback', { key: key, from: currentLocale, to: loc, time: Date.now() });
          }
          return { value: value, locale: loc, missing: false };
        }
      }
      emit('missing', { key: key, locale: currentLocale, time: Date.now() });
      return { value: key, locale: null, missing: true };
    }

    return {
      t: function (key, vars, context) {
        var r = resolve(key);
        if (typeof r.value !== 'string') return r.value;
        var ctx = context || {};
        if (!ctx.locale) {
          var merged = {};
          for (var k in ctx) merged[k] = ctx[k];
          merged.locale = r.locale || currentLocale;
          ctx = merged;
        }
        return formatMessage(r.value, vars, ctx);
      },
      resolve: resolve,
      has: function (key, locale) {
        var dict = locales[locale || currentLocale];
        return !!(dict && getPath(dict, key) !== undefined && getPath(dict, key) !== null);
      },
      setLocale: function (locale) { currentLocale = locale; },
      getLocale: function () { return currentLocale; },
      getDefaultLocale: function () { return defaultLocale; },
      registerLocale: function (locale, dict) { locales[locale] = dict; },
      hasLocale: function (locale) { return !!locales[locale]; },
      on: function (type, fn) {
        if (listeners[type]) listeners[type].push(fn);
      }
    };
  }

  return {
    getPath: getPath,
    selectPluralCategory: selectPluralCategory,
    formatMessage: formatMessage,
    createTranslator: createTranslator,
    FALLBACK_PLURAL_RULES: FALLBACK_PLURAL_RULES
  };
});
