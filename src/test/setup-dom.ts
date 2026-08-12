/** 测试基座：注入 jsdom 全局（bun test --preload ./src/test/setup-dom.ts 引用）
 * 关键：Bun 自带 Event/CustomEvent/EventTarget 等全局与 jsdom 实例互不认（报 parameter is not of type 'Event'），
 * 必须【无条件覆盖】（g[k] = w[k] 而非 if (!(k in g))），否则保留的是 Bun 的全局。
 * 见 docs/ui-analysis.md §11.7
 */
import { JSDOM } from 'jsdom'

// 先保存 Bun 原生 timer/微任务（jsdom 的 setTimeout 在 Bun 下递归爆栈 RangeError，见下）
const nativeSetTimeout = globalThis.setTimeout.bind(globalThis)
const nativeClearTimeout = globalThis.clearTimeout.bind(globalThis)
const nativeSetInterval = globalThis.setInterval.bind(globalThis)
const nativeClearInterval = globalThis.clearInterval.bind(globalThis)
const nativeQueueMicrotask = globalThis.queueMicrotask?.bind(globalThis)

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://quanming1.github.io/minimal-blog/',
  // 不用 pretendToBeVisual：jsdom 原生 rAF 依赖其内部定时器，在 Bun 下会递归爆栈
})

const g = globalThis as Record<string, unknown>
const w = dom.window as unknown as Record<string, unknown>

// 无条件覆盖：复制 jsdom window 全部自身属性（含 Event/CustomEvent/HTMLElement 等与 Bun 冲突项）
// 只读属性（如 window/self 自引用）赋值失败跳过即可，关键冲突项都是可写的
for (const k of Object.getOwnPropertyNames(w)) {
  try {
    g[k] = w[k]
  } catch {
    /* readonly property on globalThis */
  }
}
g.window = g
g.self = g
g.navigator = w.navigator
g.getComputedStyle = w.getComputedStyle
g.getSelection = w.getSelection
g.customElements = w.customElements
g.MutationObserver = w.MutationObserver
g.CSSStyleSheet = w.CSSStyleSheet
// 轻量 rAF mock（jsdom 原生 rAF 依赖其内部定时器，在 Bun 下会递归爆栈）
g.requestAnimationFrame = (cb: FrameRequestCallback) => nativeSetTimeout(() => cb(Date.now()), 16)
g.cancelAnimationFrame = (id: number) => nativeClearTimeout(id)

// 还原 Bun 原生 timer：jsdom 的 window.setTimeout 闭包绑定其内部 window，
// 复制到 globalThis 后 this 错位 → timerInitializationSteps 无限递归
g.setTimeout = nativeSetTimeout
g.clearTimeout = nativeClearTimeout
g.setInterval = nativeSetInterval
g.clearInterval = nativeClearInterval
if (nativeQueueMicrotask) g.queueMicrotask = nativeQueueMicrotask
g.matchMedia =
  w.matchMedia ??
  (() => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  }))
