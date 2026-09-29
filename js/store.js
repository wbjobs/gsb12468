/*
 * IndexedDB 持久化
 * - cache: 缓存语言包（切换语言不闪烁的关键：首屏先从缓存读）
 * - missing: 缺失文案记录
 * - fallbacks: 回退事件日志
 */
(function (global) {
  'use strict';

  var DB_NAME = 'i18n-demo';
  var DB_VERSION = 1;
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('IndexedDB unsupported')); return; }
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
        if (!db.objectStoreNames.contains('missing')) db.createObjectStore('missing', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fallbacks')) db.createObjectStore('fallbacks', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var result = fn(t.objectStore(store));
        t.oncomplete = function () { resolve(result && result._value); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  var Store = {
    // 语言包缓存
    savePack: function (lang, data) {
      return open().then(function (db) {
        return reqToPromise(db.transaction('cache', 'readwrite').objectStore('cache').put(data, 'pack:' + lang));
      });
    },
    loadPack: function (lang) {
      return open().then(function (db) {
        return reqToPromise(db.transaction('cache', 'readonly').objectStore('cache').get('pack:' + lang));
      });
    },
    // 缺失文案
    addMissing: function (entry) {
      var record = { id: entry.lang + '::' + entry.key, key: entry.key, lang: entry.lang, time: entry.time };
      return open().then(function (db) {
        return reqToPromise(db.transaction('missing', 'readwrite').objectStore('missing').put(record));
      });
    },
    getMissing: function () {
      return open().then(function (db) {
        return reqToPromise(db.transaction('missing', 'readonly').objectStore('missing').getAll());
      });
    },
    clearMissing: function () {
      return open().then(function (db) {
        return reqToPromise(db.transaction('missing', 'readwrite').objectStore('missing').clear());
      });
    },
    // 回退日志
    addFallback: function (entry) {
      return open().then(function (db) {
        return reqToPromise(db.transaction('fallbacks', 'readwrite').objectStore('fallbacks').add(entry));
      });
    },
    getFallbacks: function () {
      return open().then(function (db) {
        return reqToPromise(db.transaction('fallbacks', 'readonly').objectStore('fallbacks').getAll());
      });
    },
    clearFallbacks: function () {
      return open().then(function (db) {
        return reqToPromise(db.transaction('fallbacks', 'readwrite').objectStore('fallbacks').clear());
      });
    }
  };

  global.I18nStore = Store;
})(window);
