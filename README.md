# i18n Demo — 多语言 / 回退链 / Intl 降级

无框架（原生 JS + DOM + IndexedDB + Web Worker）的多语言演示应用。

## 运行

```bash
# 需要通过 http 访问（Web Worker / IndexedDB 在 file:// 下受限）
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 测试

```bash
node tests/run-tests.js
```

## 功能

- **6 种语言**：en（默认，完整）、zh-CN、ja、fr、ru、ar（RTL），其余语言故意缺失部分 key 以演示回退。
- **文案组织**：点号嵌套 key（`nav.home`）、变量插值（`{name}`）、ICU 风格复数（`{count, plural, =0{...} one{...} other{...}}`，`#` 为格式化后的数字，模板支持嵌套）。
- **回退链**：当前语言 → 默认语言（en）→ key 本身。任何情况下都不会显示空白。
- **Intl 能力检测**：`Intl` / `NumberFormat` / `DateTimeFormat` / `PluralRules` / `RelativeTimeFormat` 逐项检测；页面可勾选“模拟不支持 Intl”演示降级路径。
- **降级策略**：
  - 复数：内置 en/zh/ja/fr/ru/ar 规则表（与 CLDR 类别一致，测试中与 `Intl.PluralRules` 对照）。
  - 数字：千分位正则格式化。
  - 日期：固定 `YYYY-MM-DD HH:mm:ss`。
  - 相对时间：用词词典中的 `fmt.units.*` / `fmt.relative.*` 模板，仍然本地化。
- **切换不闪烁**：新词典异步加载（Web Worker + IndexedDB 缓存）期间保留旧内容，就绪后在同一 `requestAnimationFrame` 内批量更新 DOM。
- **可观测**：缺失文案列表与回退记录持久化在 IndexedDB（不可用时降级为内存），页面实时展示、可清空。

## 文件结构

| 文件 | 职责 |
| --- | --- |
| `js/i18n-core.js` | 纯逻辑核心：嵌套 key、插值、复数解析、回退链（Node 可测） |
| `js/intl-support.js` | Intl 能力检测与数字/日期/相对时间格式化（含降级） |
| `js/locales.js` | 6 语言内置词典（含故意缺失的 key） |
| `js/db.js` | IndexedDB 封装（词典缓存 + 缺失/回退日志，内存降级） |
| `js/locale-worker.js` | Web Worker 异步加载词典 |
| `js/app.js` | UI 绑定、无闪烁切换、面板渲染 |
| `tests/run-tests.js` | 核心引擎 Node 测试 |
