/*
 * intl-support.js — Intl 能力检测与格式化（不支持时降级为简单格式化）。
 * 可在浏览器与 Node 中运行。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.IntlSupport = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  /*
   * 检测 Intl 各能力。forceOff 为 true 时模拟“浏览器完全不支持 Intl”，
   * 用于演示降级路径。
   */
  function detect(forceOff) {
    if (forceOff) {
      return {
        intl: false,
        numberFormat: false,
        dateTimeFormat: false,
        pluralRules: false,
        relativeTimeFormat: false
      };
    }
    var has = typeof Intl !== 'undefined' && !!Intl;
    return {
      intl: has,
      numberFormat: has && typeof Intl.NumberFormat === 'function',
      dateTimeFormat: has && typeof Intl.DateTimeFormat === 'function',
      pluralRules: has && typeof Intl.PluralRules === 'function',
      relativeTimeFormat: has && typeof Intl.RelativeTimeFormat === 'function'
    };
  }

  /* ---------- 数字 ---------- */
  function fallbackNumber(value) {
    if (!isFinite(value)) return String(value);
    var negative = value < 0;
    var parts = String(Math.abs(value)).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (negative ? '-' : '') + parts.join('.');
  }

  function formatNumber(value, locale, caps) {
    if (caps && caps.numberFormat) {
      try { return new Intl.NumberFormat(locale).format(value); } catch (e) { /* 降级 */ }
    }
    return fallbackNumber(value);
  }

  /* ---------- 日期时间 ---------- */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function fallbackDate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) +
      ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
  }

  function formatDate(date, locale, caps, options) {
    if (caps && caps.dateTimeFormat) {
      try {
        return new Intl.DateTimeFormat(locale, options || { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      } catch (e) { /* 降级 */ }
    }
    return fallbackDate(date);
  }

  /* ---------- 相对时间 ---------- */
  function splitRelative(seconds) {
    var abs = Math.abs(seconds);
    if (abs < 60) return { value: Math.round(abs), unit: 'second' };
    if (abs < 3600) return { value: Math.round(abs / 60), unit: 'minute' };
    if (abs < 86400) return { value: Math.round(abs / 3600), unit: 'hour' };
    return { value: Math.round(abs / 86400), unit: 'day' };
  }

  /*
   * 相对时间。Intl.RelativeTimeFormat 不可用时，用词典里的
   * fmt.units.* / fmt.relative.past / fmt.relative.future 模板降级（仍然本地化）。
   * t(key, vars) 为翻译函数。
   */
  function formatRelativeTime(seconds, locale, caps, t) {
    var part = splitRelative(seconds);
    if (caps && caps.relativeTimeFormat) {
      try {
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
          .format(seconds < 0 ? -part.value : part.value, part.unit);
      } catch (e) { /* 降级 */ }
    }
    if (typeof t === 'function') {
      var unitName = t('fmt.units.' + part.unit, { count: part.value });
      var key = seconds < 0 ? 'fmt.relative.past' : 'fmt.relative.future';
      return t(key, { value: part.value, unit: unitName });
    }
    return (seconds < 0 ? '-' : '+') + part.value + ' ' + part.unit + (part.value === 1 ? '' : 's');
  }

  return {
    detect: detect,
    formatNumber: formatNumber,
    formatDate: formatDate,
    formatRelativeTime: formatRelativeTime,
    fallbackNumber: fallbackNumber,
    fallbackDate: fallbackDate
  };
});
