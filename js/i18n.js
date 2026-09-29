/*
 * I18n 核心引擎
 * - 嵌套 key（a.b.c）
 * - 变量插值 {name}
 * - 复数（对象形式 {zero,one,two,few,many,other}，按 Intl.PluralRules 或降级规则选择）
 * - 回退链：当前语言 → 默认语言 → key 本身（绝不显示空白）
 * - 记录缺失文案与回退事件
 */
(function (global) {
  'use strict';

  var PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];

  function getNested(obj, path) {
    var node = obj;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (node == null || typeof node !== 'object') return undefined;
      node = node[parts[i]];
    }
    return node;
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (match, name) {
      return vars[name] != null ? String(vars[name]) : match;
    });
  }

  function I18n(options) {
    this.locales = options.locales || {};
    this.defaultLang = options.defaultLang || 'en';
    this.lang = options.lang || this.defaultLang;
    this.support = options.support;
    this.missingKeys = [];    // [{key, lang, time}]
    this.fallbackLog = [];    // [{key, from, to, time, reason}]
    this._missingSet = {};
    this._pluralSelect = global.IntlSupport.pluralSelector(this.lang, this.support);
    this._listeners = [];
  }

  I18n.prototype.onFallback = function (fn) { this._listeners.push(fn); };

  I18n.prototype._emit = function (entry) {
    for (var i = 0; i < this._listeners.length; i++) {
      try { this._listeners[i](entry); } catch (e) {}
    }
  };

  I18n.prototype.setLang = function (lang) {
    this.lang = lang;
    this._pluralSelect = global.IntlSupport.pluralSelector(lang, this.support);
  };

  I18n.prototype._recordMissing = function (key, lang) {
    var id = lang + '::' + key;
    if (this._missingSet[id]) return;
    this._missingSet[id] = true;
    var entry = { key: key, lang: lang, time: Date.now() };
    this.missingKeys.push(entry);
    this._emit({ type: 'missing', entry: entry });
  };

  I18n.prototype._recordFallback = function (key, from, to, reason) {
    var entry = { key: key, from: from, to: to, reason: reason, time: Date.now() };
    this.fallbackLog.push(entry);
    this._emit({ type: 'fallback', entry: entry });
  };

  /*
   * 在指定语言中解析 key：
   *  - 字符串 → 直接返回
   *  - 复数对象 → 选类别；类别缺失时在同语言内回退到 other（记录），仍缺则视为未命中
   */
  I18n.prototype._resolveIn = function (lang, key, vars) {
    var raw = getNested(this.locales[lang], key);
    if (raw == null) return undefined;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') {
      var count = vars && vars.count != null ? Number(vars.count) : 1;
      var category = count === 0 && raw.zero != null ? 'zero' : this._pluralSelect(count);
      if (raw[category] != null) return raw[category];
      if (raw.other != null) {
        this._recordFallback(key + '.' + category, lang, lang + '::other', 'plural-category-missing');
        return raw.other;
      }
      for (var i = 0; i < PLURAL_CATEGORIES.length; i++) {
        if (raw[PLURAL_CATEGORIES[i]] != null) {
          this._recordFallback(key + '.' + category, lang, lang + '::' + PLURAL_CATEGORIES[i], 'plural-category-missing');
          return raw[PLURAL_CATEGORIES[i]];
        }
      }
    }
    return undefined;
  };

  /*
   * 翻译主入口。回退链：当前语言 → 默认语言 → key 本身。
   */
  I18n.prototype.t = function (key, vars) {
    var result = this._resolveIn(this.lang, key, vars);
    if (result != null) return interpolate(result, vars);

    this._recordMissing(key, this.lang);

    if (this.lang !== this.defaultLang) {
      result = this._resolveIn(this.defaultLang, key, vars);
      if (result != null) {
        this._recordFallback(key, this.lang, this.defaultLang, 'key-missing');
        return interpolate(result, vars);
      }
      this._recordMissing(key, this.defaultLang);
    }

    this._recordFallback(key, this.lang, 'key-itself', 'all-locales-missing');
    return key; // 最后手段：显示 key 本身，绝不显示空白
  };

  /* 格式化便捷方法（自动使用降级实现） */
  I18n.prototype.number = function (value, options) {
    return global.IntlSupport.formatNumber(value, this.lang, this.support, options);
  };
  I18n.prototype.dateTime = function (date, options) {
    return global.IntlSupport.formatDateTime(date, this.lang, this.support, options);
  };
  I18n.prototype.relativeTime = function (value, unit) {
    return global.IntlSupport.formatRelativeTime(value, unit, this.lang, this.support);
  };

  global.I18n = I18n;
})(window);
