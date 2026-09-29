/*
 * 应用入口：UI 渲染、语言切换（不闪烁）、Worker 缺失分析、IndexedDB 持久化
 */
(function () {
  'use strict';

  var LANGS = [
    { code: 'zh-CN', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'fr', label: 'Français' },
    { code: 'ru', label: 'Русский' }
  ];
  var DEFAULT_LANG = 'en';
  var PLURAL_DEMO_COUNTS = [0, 1, 2, 3, 5, 11, 21, 25, 101];

  var support = window.IntlSupport.detect();
  var savedLang = localStorage.getItem('i18n-lang') || 'zh-CN';
  if (LANGS.every(function (l) { return l.code !== savedLang; })) savedLang = DEFAULT_LANG;

  var i18n = new window.I18n({
    locales: window.__LOCALES__,
    defaultLang: DEFAULT_LANG,
    lang: savedLang,
    support: support
  });

  /* ---------- 持久化：新事件写入 IndexedDB 并刷新面板 ---------- */
  i18n.onFallback(function (evt) {
    var p = evt.type === 'missing' ? window.I18nStore.addMissing(evt.entry)
                                   : window.I18nStore.addFallback(evt.entry);
    p.then(evt.type === 'missing' ? renderMissing : renderFallbackLog).catch(function () {});
  });

  /* ---------- 无闪烁语言切换 ----------
   * 1. 文案数据已在内存（语言包为同步加载的 JS），无需等待网络；
   * 2. 一次性收集所有 [data-i18n] 节点，在单个 rAF 内批量更新，
   *    浏览器只产生一次重绘，用户看不到中间态；
   * 3. 切换前不清空任何内容（绝不出现空白帧）。
   */
  function applyTranslations() {
    document.documentElement.lang = i18n.lang;
    var nodes = document.querySelectorAll('[data-i18n]');
    var jobs = [];
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        var key = el.getAttribute('data-i18n');
        var vars = el.getAttribute('data-i18n-vars');
        jobs.push(function () {
          el.textContent = i18n.t(key, vars ? JSON.parse(vars) : undefined);
        });
      })(nodes[i]);
    }
    requestAnimationFrame(function () {
      for (var j = 0; j < jobs.length; j++) jobs[j]();
      renderDynamic();
    });
  }

  function switchLang(lang) {
    if (i18n.lang === lang) return;
    i18n.setLang(lang);
    localStorage.setItem('i18n-lang', lang);
    updateLangButtons();
    applyTranslations();
  }

  /* ---------- 动态演示区 ---------- */
  function renderDynamic() {
    // 问候语（变量插值）
    setText('demo-greeting', i18n.t('greeting', { name: 'Ada' }));
    setText('demo-welcome', i18n.t('welcome', {
      name: 'Ada',
      time: i18n.dateTime(new Date(Date.now() - 36e5 * 5))
    }));

    // 复数演示
    var cartRows = PLURAL_DEMO_COUNTS.map(function (n) {
      return '<tr><td>' + n + '</td><td>' + escapeHtml(i18n.t('cart.items', { count: n })) + '</td>' +
             '<td>' + escapeHtml(i18n.t('inbox.messages', { count: n })) + '</td></tr>';
    }).join('');
    setHtml('plural-body', cartRows);

    // 格式化演示
    var now = new Date();
    setText('fmt-date', i18n.dateTime(now));
    setText('fmt-number', i18n.number(1234567.891));
    setText('fmt-currency', i18n.number(9876.5, { style: 'currency', currency: 'CNY' }));
    setText('fmt-percent', i18n.number(0.857, { style: 'percent', maximumFractionDigits: 1 }));
    setText('fmt-rel-1', i18n.relativeTime(-5, 'minute'));
    setText('fmt-rel-2', i18n.relativeTime(-3, 'day'));
    setText('fmt-rel-3', i18n.relativeTime(2, 'week'));
    setText('fmt-rel-4', i18n.relativeTime(-1, 'year'));
  }

  /* ---------- Intl 支持面板 ---------- */
  function renderSupport() {
    var rows = [
      ['Intl', support.intl],
      ['Intl.PluralRules', support.pluralRules],
      ['Intl.RelativeTimeFormat', support.relativeTimeFormat],
      ['Intl.DateTimeFormat', support.dateTimeFormat],
      ['Intl.NumberFormat', support.numberFormat]
    ].map(function (r) {
      var ok = r[1];
      return '<tr><td><code>' + r[0] + '</code></td>' +
        '<td class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ 支持' : '✗ 不支持 → 已启用降级') + '</td></tr>';
    }).join('');
    setHtml('support-body', rows);
  }

  /* ---------- 缺失文案 & 回退日志面板 ---------- */
  function renderMissing() {
    return window.I18nStore.getMissing().then(function (list) {
      list.sort(function (a, b) { return b.time - a.time; });
      setHtml('missing-body', list.length ? list.map(function (m) {
        return '<tr><td><code>' + escapeHtml(m.key) + '</code></td><td>' + escapeHtml(m.lang) +
               '</td><td>' + new Date(m.time).toLocaleTimeString() + '</td></tr>';
      }).join('') : '<tr><td colspan="3" class="empty">（无缺失记录）</td></tr>');
    }).catch(function () {});
  }

  function renderFallbackLog() {
    return window.I18nStore.getFallbacks().then(function (list) {
      list.sort(function (a, b) { return b.time - a.time; });
      var recent = list.slice(0, 100);
      setHtml('fallback-body', recent.length ? recent.map(function (f) {
        return '<tr><td><code>' + escapeHtml(f.key) + '</code></td><td>' + escapeHtml(f.from) +
               ' → ' + escapeHtml(f.to) + '</td><td>' + escapeHtml(f.reason) +
               '</td><td>' + new Date(f.time).toLocaleTimeString() + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="empty">（暂无回退事件）</td></tr>');
    }).catch(function () {});
  }

  /* ---------- Web Worker：缺失键矩阵 ---------- */
  function runWorkerDiff() {
    var el = document.getElementById('worker-result');
    function fallbackCompute() {
      var report = {};
      var base = window.__LOCALES__[DEFAULT_LANG];
      LANGS.forEach(function (l) {
        if (l.code === DEFAULT_LANG) return;
        var missing = [];
        (function walk(node, ref, path) {
          for (var k in ref) {
            var p = path ? path + '.' + k : k;
            if (ref[k] != null && typeof ref[k] === 'object') walk(node && node[k], ref[k], p);
            else if (!node || node[k] == null) missing.push(p);
          }
        })(window.__LOCALES__[l.code], base, '');
        report[l.code] = missing;
      });
      showReport(report);
    }
    function showReport(report) {
      var html = '';
      LANGS.forEach(function (l) {
        if (l.code === DEFAULT_LANG) return;
        var keys = report[l.code] || [];
        html += '<li><strong>' + l.label + '</strong>：' +
          (keys.length ? keys.map(function (k) { return '<code>' + escapeHtml(k) + '</code>'; }).join('、')
                       : '无缺失') + '</li>';
      });
      el.innerHTML = html;
    }
    if (!window.Worker) { fallbackCompute(); return; }
    try {
      var worker = new Worker('js/worker.js');
      var timer = setTimeout(function () { worker.terminate(); fallbackCompute(); }, 3000);
      worker.onmessage = function (e) {
        clearTimeout(timer);
        if (e.data && e.data.type === 'diff-result') showReport(e.data.report);
        worker.terminate();
      };
      worker.onerror = function () { clearTimeout(timer); worker.terminate(); fallbackCompute(); };
      worker.postMessage({ type: 'diff', locales: window.__LOCALES__, defaultLang: DEFAULT_LANG });
    } catch (err) {
      fallbackCompute();
    }
  }

  /* ---------- 工具 ---------- */
  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  function setHtml(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 语言切换按钮 ---------- */
  function updateLangButtons() {
    var btns = document.querySelectorAll('#lang-switch button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-lang') === i18n.lang);
    }
  }

  function buildLangSwitcher() {
    var box = document.getElementById('lang-switch');
    LANGS.forEach(function (l) {
      var btn = document.createElement('button');
      btn.textContent = l.label;
      btn.setAttribute('data-lang', l.code);
      btn.addEventListener('click', function () { switchLang(l.code); });
      box.appendChild(btn);
    });
    updateLangButtons();
  }

  /* ---------- 启动 ----------
   * 语言包通过 <script> 同步加载，首屏渲染前数据已就绪；
   * 同时将语言包写入 IndexedDB 缓存（演示缓存能力，二次访问可直接命中）。
   */
  function init() {
    buildLangSwitcher();
    renderSupport();
    applyTranslations();
    runWorkerDiff();
    renderMissing();
    renderFallbackLog();

    LANGS.forEach(function (l) {
      window.I18nStore.savePack(l.code, window.__LOCALES__[l.code]).catch(function () {});
    });

    document.getElementById('clear-missing').addEventListener('click', function () {
      window.I18nStore.clearMissing().then(renderMissing);
    });
    document.getElementById('clear-fallbacks').addEventListener('click', function () {
      window.I18nStore.clearFallbacks().then(renderFallbackLog);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
