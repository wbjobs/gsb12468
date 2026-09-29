/*
 * Web Worker：离线计算各语言相对默认语言的缺失键矩阵，
 * 避免在主线程遍历大型语言包造成卡顿。
 */
'use strict';

function flatten(obj, prefix, out) {
  out = out || {};
  for (var k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    var path = prefix ? prefix + '.' + k : k;
    var v = obj[k];
    if (v != null && typeof v === 'object') flatten(v, path, out);
    else out[path] = v;
  }
  return out;
}

self.onmessage = function (e) {
  var data = e.data;
  if (!data || data.type !== 'diff') return;
  var locales = data.locales;
  var defaultLang = data.defaultLang;
  var base = flatten(locales[defaultLang] || {});
  var report = {};
  for (var lang in locales) {
    if (!Object.prototype.hasOwnProperty.call(locales, lang) || lang === defaultLang) continue;
    var flat = flatten(locales[lang]);
    var missing = [];
    for (var key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key) && flat[key] == null) missing.push(key);
    }
    report[lang] = missing;
  }
  self.postMessage({ type: 'diff-result', report: report });
};
