/*
 * 核心引擎测试：node tests/run-tests.js
 * 覆盖：嵌套 key、插值、复数（Intl 与降级规则）、回退链、缺失处理。
 */
'use strict';

const assert = require('assert');
const I18nCore = require('../js/i18n-core.js');
const IntlSupport = require('../js/intl-support.js');
const LOCALE_DATA = require('../js/locales.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    console.error('  ✗ ' + name);
    console.error('    ' + err.message);
    process.exitCode = 1;
  }
}

const NO_INTL = { pluralRules: false }; // 强制走内置复数规则

console.log('嵌套 key 与插值');
test('嵌套 key 读取', () => {
  assert.strictEqual(I18nCore.getPath({ a: { b: { c: 1 } } }, 'a.b.c'), 1);
  assert.strictEqual(I18nCore.getPath({ a: {} }, 'a.b.c'), undefined);
});
test('变量插值', () => {
  assert.strictEqual(
    I18nCore.formatMessage('Hello, {name}!', { name: 'Ada' }),
    'Hello, Ada!'
  );
});
test('缺失变量保留占位符（不显示空白）', () => {
  assert.strictEqual(I18nCore.formatMessage('Hi {name}', {}), 'Hi {name}');
});
test('非字符串消息安全返回', () => {
  assert.strictEqual(I18nCore.formatMessage(null), '');
  assert.strictEqual(I18nCore.formatMessage(42), '42');
});

console.log('复数（Intl.PluralRules）');
test('en: one/other 与精确 =0', () => {
  const msg = '{count, plural, =0{none} one{# item} other{# items}}';
  assert.strictEqual(I18nCore.formatMessage(msg, { count: 0 }, { locale: 'en' }), 'none');
  assert.strictEqual(I18nCore.formatMessage(msg, { count: 1 }, { locale: 'en' }), '1 item');
  assert.strictEqual(I18nCore.formatMessage(msg, { count: 5 }, { locale: 'en' }), '5 items');
});
test('zh: 永远 other', () => {
  assert.strictEqual(I18nCore.selectPluralCategory('zh-CN', 1), 'other');
  assert.strictEqual(I18nCore.selectPluralCategory('zh-CN', 99), 'other');
});
test('ru: one/few/many', () => {
  assert.strictEqual(I18nCore.selectPluralCategory('ru', 1), 'one');
  assert.strictEqual(I18nCore.selectPluralCategory('ru', 3), 'few');
  assert.strictEqual(I18nCore.selectPluralCategory('ru', 5), 'many');
  assert.strictEqual(I18nCore.selectPluralCategory('ru', 21), 'one');
  assert.strictEqual(I18nCore.selectPluralCategory('ru', 11), 'many');
});
test('ar: zero/one/two/few/many/other', () => {
  assert.strictEqual(I18nCore.selectPluralCategory('ar', 0), 'zero');
  assert.strictEqual(I18nCore.selectPluralCategory('ar', 1), 'one');
  assert.strictEqual(I18nCore.selectPluralCategory('ar', 2), 'two');
  assert.strictEqual(I18nCore.selectPluralCategory('ar', 5), 'few');
  assert.strictEqual(I18nCore.selectPluralCategory('ar', 11), 'many');
  assert.strictEqual(I18nCore.selectPluralCategory('ar', 100), 'other');
});

console.log('复数（降级：内置规则表，模拟无 Intl.PluralRules）');
test('ru 降级规则与 Intl 一致', () => {
  [0, 1, 2, 3, 5, 11, 21, 25, 101].forEach((n) => {
    assert.strictEqual(
      I18nCore.selectPluralCategory('ru', n, NO_INTL),
      I18nCore.selectPluralCategory('ru', n),
      'ru n=' + n
    );
  });
});
test('ar 降级规则与 Intl 一致', () => {
  [0, 1, 2, 3, 5, 11, 99, 100, 200].forEach((n) => {
    assert.strictEqual(
      I18nCore.selectPluralCategory('ar', n, NO_INTL),
      I18nCore.selectPluralCategory('ar', n),
      'ar n=' + n
    );
  });
});
test('fr 降级：0 和 1 都是 one', () => {
  assert.strictEqual(I18nCore.selectPluralCategory('fr', 0, NO_INTL), 'one');
  assert.strictEqual(I18nCore.selectPluralCategory('fr', 2, NO_INTL), 'other');
});
test('复数模板内可嵌套变量', () => {
  const msg = '{count, plural, one{{user} has # file} other{{user} has # files}}';
  assert.strictEqual(
    I18nCore.formatMessage(msg, { count: 2, user: 'Ada' }, { locale: 'en' }),
    'Ada has 2 files'
  );
});

console.log('回退链');
function makeTranslator(onFallback, onMissing) {
  const tr = I18nCore.createTranslator({
    locales: LOCALE_DATA,
    defaultLocale: 'en',
    locale: 'ja'
  });
  if (onFallback) tr.on('fallback', onFallback);
  if (onMissing) tr.on('missing', onMissing);
  return tr;
}
test('当前语言命中时不回退', () => {
  const events = [];
  const tr = makeTranslator(null, null);
  tr.on('fallback', (e) => events.push(e));
  assert.strictEqual(tr.t('greeting.hello', { name: 'X' }), 'こんにちは、Xさん！');
  assert.strictEqual(events.length, 0);
});
test('当前语言缺失 → 回退默认语言，并记录事件', () => {
  const events = [];
  const tr = makeTranslator(null, null);
  tr.on('fallback', (e) => events.push(e));
  const text = tr.t('nav.settings'); // ja 缺失，en 存在
  assert.strictEqual(text, 'Settings');
  assert.strictEqual(events.length, 1);
  assert.deepStrictEqual(
    { key: events[0].key, from: events[0].from, to: events[0].to },
    { key: 'nav.settings', from: 'ja', to: 'en' }
  );
});
test('整节点缺失 → 回退默认语言', () => {
  const tr = makeTranslator(null, null);
  assert.strictEqual(tr.t('footer.copyright'), '© 2026 i18n Demo. All rights reserved.');
});
test('所有语言都缺失 → 返回 key 本身（不显示空白），并记录 missing', () => {
  const missing = [];
  const tr = makeTranslator(null, null);
  tr.on('missing', (e) => missing.push(e));
  assert.strictEqual(tr.t('demo.nonexistent.key'), 'demo.nonexistent.key');
  assert.strictEqual(missing.length, 1);
  assert.strictEqual(missing[0].key, 'demo.nonexistent.key');
});
test('默认语言自身缺失 → 直接返回 key，不产生 fallback 事件', () => {
  const events = [];
  const tr = I18nCore.createTranslator({
    locales: LOCALE_DATA, defaultLocale: 'en', locale: 'en'
  });
  tr.on('fallback', (e) => events.push(e));
  assert.strictEqual(tr.t('nope.key'), 'nope.key');
  assert.strictEqual(events.length, 0);
});
test('回退消息的复数按消息来源语言解析', () => {
  // ar 缺失 footer，但这里验证：用 ar 的词典缺失 key 回退到 en 后按 en 复数
  const tr = I18nCore.createTranslator({
    locales: { ar: {}, en: LOCALE_DATA.en },
    defaultLocale: 'en',
    locale: 'ar'
  });
  assert.strictEqual(
    tr.t('inbox.messages', { count: 1 }),
    '1 message'
  );
});

console.log('格式化降级');
test('数字降级：千分位', () => {
  assert.strictEqual(IntlSupport.formatNumber(1234567.89, 'en', { numberFormat: false }), '1,234,567.89');
  assert.strictEqual(IntlSupport.formatNumber(-12345, 'en', { numberFormat: false }), '-12,345');
});
test('日期降级：固定格式，不依赖 Intl', () => {
  const d = new Date(2026, 8, 30, 9, 5, 3);
  assert.strictEqual(
    IntlSupport.formatDate(d, 'en', { dateTimeFormat: false }),
    '2026-09-30 09:05:03'
  );
});
test('相对时间降级：使用词典模板（仍本地化）', () => {
  const tr = I18nCore.createTranslator({
    locales: LOCALE_DATA, defaultLocale: 'en', locale: 'zh-CN'
  });
  const t = (k, v) => tr.t(k, v, { caps: NO_INTL });
  assert.strictEqual(
    IntlSupport.formatRelativeTime(-300, 'zh-CN', { relativeTimeFormat: false }, t),
    '5分钟前'
  );
});
test('Intl 能力检测（模拟关闭）', () => {
  const off = IntlSupport.detect(true);
  assert.deepStrictEqual(off, {
    intl: false, numberFormat: false, dateTimeFormat: false,
    pluralRules: false, relativeTimeFormat: false
  });
  const on = IntlSupport.detect(false);
  assert.strictEqual(on.pluralRules, true); // Node 22 自带完整 ICU
});

console.log('\n' + passed + ' 个测试通过' + (process.exitCode ? '（存在失败）' : ''));
