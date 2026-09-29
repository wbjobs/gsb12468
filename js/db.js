/*
 * db.js — IndexedDB 持久层：缓存词典、记录缺失文案与回退日志。
 * indexedDB 不可用（隐私模式 / 老浏览器）时自动降级为内存存储，接口不变。
 */
(function (root) {
  'use strict';

  var DB_NAME = 'i18n-demo-db';
  var DB_VERSION = 1;
  var STORE_LOCALES = 'locales';
  var STORE_MISSING = 'missing';
  var STORE_FALLBACKS = 'fallbacks';

  var dbPromise = null;
  var useMemory = typeof indexedDB === 'undefined';
  var memory = { locales: {}, missing: [], fallbacks: [] };

  function open() {
    if (useMemory) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        useMemory = true;
        return resolve(null);
      }
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_LOCALES)) {
          db.createObjectStore(STORE_LOCALES, { keyPath: 'locale' });
        }
        if (!db.objectStoreNames.contains(STORE_MISSING)) {
          db.createObjectStore(STORE_MISSING, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_FALLBACKS)) {
          db.createObjectStore(STORE_FALLBACKS, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { useMemory = true; resolve(null); };
    });
    return dbPromise;
  }

  function tx(db, store, mode, fn) {
    return new Promise(function (resolve, reject) {
      var transaction = db.transaction(store, mode);
      var request = fn(transaction.objectStore(store));
      transaction.oncomplete = function () { resolve(request ? request.result : undefined); };
      transaction.onerror = function () { reject(transaction.error); };
    });
  }

  function putLocale(locale, dict) {
    if (useMemory) { memory.locales[locale] = dict; return Promise.resolve(); }
    return open().then(function (db) {
      if (!db) { memory.locales[locale] = dict; return; }
      return tx(db, STORE_LOCALES, 'readwrite', function (s) {
        s.put({ locale: locale, dict: dict, savedAt: Date.now() });
      });
    }).catch(function () { memory.locales[locale] = dict; });
  }

  function getLocale(locale) {
    if (useMemory) return Promise.resolve(memory.locales[locale] || null);
    return open().then(function (db) {
      if (!db) return memory.locales[locale] || null;
      return tx(db, STORE_LOCALES, 'readonly', function (s) { return s.get(locale); })
        .then(function (row) { return row ? row.dict : null; });
    }).catch(function () { return memory.locales[locale] || null; });
  }

  function addLog(store, entry) {
    if (useMemory) { memory[store].push(entry); return Promise.resolve(); }
    return open().then(function (db) {
      if (!db) { memory[store].push(entry); return; }
      return tx(db, store, 'readwrite', function (s) { s.add(entry); });
    }).catch(function () { memory[store].push(entry); });
  }

  function getAll(store) {
    if (useMemory) return Promise.resolve(memory[store].slice());
    return open().then(function (db) {
      if (!db) return memory[store].slice();
      return tx(db, store, 'readonly', function (s) {
        return (s.getAll ? s.getAll() : s.openCursor());
      }).then(function (rows) { return rows || []; });
    }).catch(function () { return memory[store].slice(); });
  }

  function clear(store) {
    if (useMemory) { memory[store] = []; return Promise.resolve(); }
    return open().then(function (db) {
      if (!db) { memory[store] = []; return; }
      return tx(db, store, 'readwrite', function (s) { s.clear(); });
    }).catch(function () { memory[store] = []; });
  }

  root.I18nDB = {
    STORE_MISSING: STORE_MISSING,
    STORE_FALLBACKS: STORE_FALLBACKS,
    isPersistent: function () { return !useMemory; },
    putLocale: putLocale,
    getLocale: getLocale,
    addMissing: function (entry) { return addLog(STORE_MISSING, entry); },
    addFallback: function (entry) { return addLog(STORE_FALLBACKS, entry); },
    getMissing: function () { return getAll(STORE_MISSING); },
    getFallbacks: function () { return getAll(STORE_FALLBACKS); },
    clearMissing: function () { return clear(STORE_MISSING); },
    clearFallbacks: function () { return clear(STORE_FALLBACKS); }
  };
})(typeof self !== 'undefined' ? self : globalThis);
