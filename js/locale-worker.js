/*
 * locale-worker.js — 在 Web Worker 中加载词典，避免阻塞主线程。
 * 主线程负责把结果写入 IndexedDB 缓存。
 */
'use strict';

self.onmessage = function (e) {
  var data = e.data || {};
  if (data.type !== 'load') return;
  var locale = data.locale;
  try {
    if (!self.LOCALE_DATA) {
      importScripts('locales.js'); // 相对 worker 脚本所在目录解析
    }
    var dict = self.LOCALE_DATA[locale];
    // 模拟网络延迟，验证“切换不闪烁”（旧内容保持到新词典就绪）
    setTimeout(function () {
      if (dict) {
        self.postMessage({ type: 'loaded', locale: locale, dict: dict });
      } else {
        self.postMessage({ type: 'error', locale: locale, error: 'Unknown locale: ' + locale });
      }
    }, 150);
  } catch (err) {
    self.postMessage({ type: 'error', locale: locale, error: String(err) });
  }
};
