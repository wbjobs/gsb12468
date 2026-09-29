/*
 * app.js — 演示应用主逻辑。
 * 要点：词典异步加载期间保留旧内容，就绪后在同一帧批量更新 DOM，切换不闪烁。
 */
(function () {
  'use strict';

  var DEFAULT_LOCALE = 'en';
  var LOCALES = ['en', 'zh-CN', 'ja', 'fr', 'ru', 'ar'];
  var LOCALE_NAMES = {
    en: 'English', 'zh-CN': '简体中文', ja: '日本語',
    fr: 'Français', ru: 'Русский', ar: 'العربية'
  };

  var simulateNoIntl = false;
  var caps = IntlSupport.detect(false);
  var translator = I18nCore.createTranslator({ defaultLocale: DEFAULT_LOCALE });
  var worker = null;
  var pendingLoads = {};
  var seenMissing = {};
  var seenFallback = {};
  var panelRefreshScheduled = false;

  /* ---------- 翻译 ---------- */
  function t(key, vars) {
    return translator.t(key, vars, {
      caps: caps,
      formatNumber: function (n, loc) { return IntlSupport.formatNumber(n, loc, caps); }
    });
  }

  translator.on('fallback', function (ev) {
    var id = ev.key + '|' + ev.from + '|' + ev.to;
    if (seenFallback[id]) return;
    seenFallback[id] = true;
    I18nDB.addFallback(ev).then(schedulePanelRefresh);
  });

  translator.on('missing', function (ev) {
    var id = ev.key + '|' + ev.locale;
    if (seenMissing[id]) return;
    seenMissing[id] = true;
    I18nDB.addMissing(ev).then(schedulePanelRefresh);
  });

  /* ---------- 词典加载：IndexedDB 缓存 → Web Worker → 内置数据 ---------- */
  function loadLocale(locale) {
    if (translator.hasLocale(locale)) return Promise.resolve();
    return I18nDB.getLocale(locale).then(function (cached) {
      if (cached) { translator.registerLocale(locale, cached); return; }
      return loadViaWorker(locale).then(function (dict) {
        translator.registerLocale(locale, dict);
        return I18nDB.putLocale(locale, dict);
      });
    });
  }

  function loadViaWorker(locale) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(dict) {
        if (settled) return;
        settled = true;
        resolve(dict);
      }
      function fail(err) {
        if (settled) return;
        settled = true;
        reject(err);
      }
      var timer = setTimeout(function () { inline(); }, 3000);
      function inline() {
        clearTimeout(timer);
        if (self.LOCALE_DATA && self.LOCALE_DATA[locale]) done(self.LOCALE_DATA[locale]);
        else fail(new Error('Unknown locale: ' + locale));
      }
      try {
        if (!worker) {
          worker = new Worker('js/locale-worker.js');
          worker.onmessage = function (e) {
            var data = e.data || {};
            var pending = pendingLoads[data.locale];
            if (!pending) return;
            delete pendingLoads[data.locale];
            if (data.type === 'loaded') pending.resolve(data.dict);
            else pending.reject(new Error(data.error || 'worker error'));
          };
          worker.onerror = function () {
            Object.keys(pendingLoads).forEach(function (loc) {
              pendingLoads[loc].reject(new Error('worker failed'));
            });
            pendingLoads = {};
          };
        }
        pendingLoads[locale] = {
          resolve: function (dict) { clearTimeout(timer); done(dict); },
          reject: function (err) { clearTimeout(timer); inline(); }
        };
        worker.postMessage({ type: 'load', locale: locale });
      } catch (e) {
        inline();
      }
    });
  }

  /* ---------- 语言切换（不闪烁：旧内容保持到新词典就绪，再同帧批量更新） ---------- */
  var currentLocale = null;

  function switchLocale(locale) {
    if (locale === currentLocale) return;
    setSwitching(true);
    loadLocale(locale).then(function () {
      requestAnimationFrame(function () {
        currentLocale = locale;
        translator.setLocale(locale);
        document.documentElement.lang = locale;
        var dir = translator.resolve('meta.dir').value;
        document.documentElement.dir = typeof dir === 'string' ? dir : 'ltr';
        renderAll();
        updateLangButtons();
        try { localStorage.setItem('i18n-locale', locale); } catch (e) { /* 忽略 */ }
        setSwitching(false);
      });
    }).catch(function (err) {
      setSwitching(false);
      console.error('Failed to load locale:', err);
    });
  }

  function setSwitching(on) {
    document.body.classList.toggle('switching', on);
    var status = document.getElementById('load-status');
    if (status) status.textContent = on ? '…' : '';
  }

  /* ---------- 渲染 ---------- */
  function renderAll() {
    renderStatic();
    renderTextDemo();
    renderPluralDemo();
    renderFormatDemo();
    renderCaps();
  }

  function renderStatic() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
  }

  function el(id) { return document.getElementById(id); }

  function renderTextDemo() {
    var name = el('name-input').value || 'World';
    el('demo-hello').textContent = t('greeting.hello', { name: name });
    el('demo-welcome').textContent = t('greeting.welcome', { app: 'i18n' });
    el('demo-paragraph').textContent = t('demo.paragraph');
    el('demo-tip').textContent = t('demo.tip');
    el('demo-footer').textContent = t('footer.copyright');
    el('demo-nonexistent').textContent = t('demo.nonexistent.key');
  }

  function renderPluralDemo() {
    var count = Number(el('count-range').value);
    el('count-value').textContent = IntlSupport.formatNumber(count, currentLocale, caps);
    el('plural-inbox').textContent = t('inbox.messages', { count: count });
    el('plural-cart').textContent = t('cart.items', { count: count });
    var category = I18nCore.selectPluralCategory(currentLocale, count, caps);
    el('plural-category').textContent = category;
  }

  function renderFormatDemo() {
    var now = new Date();
    el('fmt-number').textContent = IntlSupport.formatNumber(1234567.89, currentLocale, caps);
    el('fmt-date').textContent = IntlSupport.formatDate(now, currentLocale, caps);
    var samples = [
      { label: '-30s', seconds: -30 },
      { label: '-5min', seconds: -5 * 60 },
      { label: '-3h', seconds: -3 * 3600 },
      { label: '+2d', seconds: 2 * 86400 }
    ];
    var html = '';
    samples.forEach(function (s) {
      html += '<li><code>' + s.label + '</code> → ' +
        escapeHtml(IntlSupport.formatRelativeTime(s.seconds, currentLocale, caps, t)) + '</li>';
    });
    el('fmt-relative').innerHTML = html;
  }

  function renderCaps() {
    var rows = [
      ['Intl', caps.intl],
      ['Intl.NumberFormat', caps.numberFormat],
      ['Intl.DateTimeFormat', caps.dateTimeFormat],
      ['Intl.PluralRules', caps.pluralRules],
      ['Intl.RelativeTimeFormat', caps.relativeTimeFormat]
    ];
    var html = '';
    rows.forEach(function (row) {
      html += '<tr><td>' + row[0] + '</td><td class="' + (row[1] ? 'ok' : 'bad') + '">' +
        (row[1] ? '✓ 支持' : '✗ 不支持 → 降级') + '</td></tr>';
    });
    el('caps-table').innerHTML = html;
    el('storage-mode').textContent = I18nDB.isPersistent() ? 'IndexedDB' : '内存（IndexedDB 不可用，已降级）';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 缺失列表 / 回退记录面板 ---------- */
  function schedulePanelRefresh() {
    if (panelRefreshScheduled) return;
    panelRefreshScheduled = true;
    setTimeout(function () {
      panelRefreshScheduled = false;
      refreshPanels();
    }, 50);
  }

  function refreshPanels() {
    I18nDB.getMissing().then(function (rows) {
      var html = '';
      rows.slice().reverse().forEach(function (r) {
        html += '<tr><td><code>' + escapeHtml(r.key) + '</code></td><td>' + escapeHtml(r.locale) +
          '</td><td>' + new Date(r.time).toLocaleTimeString() + '</td></tr>';
      });
      el('missing-table').innerHTML = html || '<tr><td colspan="3" class="empty">（无）</td></tr>';
    });
    I18nDB.getFallbacks().then(function (rows) {
      var html = '';
      rows.slice().reverse().forEach(function (r) {
        html += '<tr><td><code>' + escapeHtml(r.key) + '</code></td><td>' + escapeHtml(r.from) +
          ' → ' + escapeHtml(r.to) + '</td><td>' + new Date(r.time).toLocaleTimeString() + '</td></tr>';
      });
      el('fallback-table').innerHTML = html || '<tr><td colspan="3" class="empty">（无）</td></tr>';
    });
  }

  /* ---------- UI 绑定 ---------- */
  function updateLangButtons() {
    var btns = document.querySelectorAll('#lang-switcher button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-locale') === currentLocale);
    }
  }

  function buildLangSwitcher() {
    var container = el('lang-switcher');
    LOCALES.forEach(function (locale) {
      var btn = document.createElement('button');
      btn.textContent = LOCALE_NAMES[locale];
      btn.setAttribute('data-locale', locale);
      btn.addEventListener('click', function () { switchLocale(locale); });
      container.appendChild(btn);
    });
    el('fallback-chain').textContent = '当前语言 → ' + DEFAULT_LOCALE + ' → key 本身';
  }

  function bindControls() {
    el('name-input').addEventListener('input', renderTextDemo);
    el('count-range').addEventListener('input', renderPluralDemo);
    var quick = document.querySelectorAll('#quick-counts button');
    for (var i = 0; i < quick.length; i++) {
      quick[i].addEventListener('click', function () {
        el('count-range').value = this.getAttribute('data-count');
        renderPluralDemo();
      });
    }
    el('simulate-no-intl').addEventListener('change', function () {
      simulateNoIntl = this.checked;
      caps = IntlSupport.detect(simulateNoIntl);
      renderAll();
    });
    el('clear-missing').addEventListener('click', function () {
      seenMissing = {};
      I18nDB.clearMissing().then(refreshPanels);
    });
    el('clear-fallbacks').addEventListener('click', function () {
      seenFallback = {};
      I18nDB.clearFallbacks().then(refreshPanels);
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    buildLangSwitcher();
    bindControls();
    // 默认语言立即注册，保证首屏无闪烁
    if (self.LOCALE_DATA && self.LOCALE_DATA[DEFAULT_LOCALE]) {
      translator.registerLocale(DEFAULT_LOCALE, self.LOCALE_DATA[DEFAULT_LOCALE]);
    }
    var initial = DEFAULT_LOCALE;
    try {
      var saved = localStorage.getItem('i18n-locale');
      if (saved && LOCALES.indexOf(saved) !== -1) initial = saved;
    } catch (e) { /* 忽略 */ }
    refreshPanels();
    if (initial === DEFAULT_LOCALE && translator.hasLocale(DEFAULT_LOCALE)) {
      currentLocale = DEFAULT_LOCALE;
      translator.setLocale(DEFAULT_LOCALE);
      document.documentElement.lang = DEFAULT_LOCALE;
      renderAll();
      updateLangButtons();
    } else {
      switchLocale(initial);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
