/** mb-toast：轻量通知（Web Component，见 docs/ui-analysis.md §11.2）
 * - show(message, { duration }) API（命令式）
 * - aria-live=polite + role=status（读屏友好）
 * - 多条垂直堆叠，自动消失 + 点击手动关闭
 * - 主题：CSS 变量继承；移动端避让底部导航（bottom 5.2em）
 * - 图标：check 内联 SVG path（自包含零依赖——shadow DOM 内 <use href="#ai:..."> 引用文档 sprite
 *   不可行：astro-icon 只在渲染 <Icon> 组件的页面生成 symbol，wc 组件须自带图标定义）
 */

/** lucide check（stroke=currentColor 随主题/accent；尺寸走 CSS 1em） */
const CHECK_ICON =
  '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

const STYLE = `
  :host {
    position: fixed;
    right: 1.2em;
    bottom: calc(1.2em + 48px); /* 避让回到顶部按钮（40px + 间距），见 v1.3.0 审查 M1 */
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5em;
    pointer-events: none;
  }
  .item {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.5em;
    background: var(--bg, #fff);
    color: var(--text, #333);
    border: 1px solid var(--divider, rgba(0,0,0,.3));
    border-left: 2px solid var(--accent, #3c5011); /* 克制 2px（印刷风 accent 不作大面积色块） */
    padding: 0.55em 1em;
    font-size: 0.92em;
    line-height: 1.5;
    max-width: 24em;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    cursor: pointer;
  }
  .toast-icon {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
    color: var(--accent, #3c5011); /* 成功对勾随 accent，与左侧 2px 边一致 */
  }
  .item.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .item.leaving {
    opacity: 0;
    transform: translateY(4px);
  }
  @media (max-width: 900px) {
    :host {
      right: 1em;
      left: 1em;
      bottom: calc(4.6em + 48px); /* 避让底部导航 + 回顶（4.6em 高 44px） */
      align-items: center;
    }
    .item {
      max-width: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .item {
      transition: none;
    }
  }
`

export class MbToast extends HTMLElement {
  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    // viewport 承担 aria-live 播报，item 不再重复 role=status
    shadow.innerHTML = `<style>${STYLE}</style><div class="viewport" role="status" aria-live="polite"></div>`
    this._viewport = shadow.querySelector('.viewport') as HTMLElement
  }

  private _viewport: HTMLElement

  /** 显示一条通知（含成功对勾图标）；返回该条目的关闭函数（duration 下限 500ms 防误用） */
  show(message: string, opts: { duration?: number } = {}): () => void {
    const duration = typeof opts.duration === 'number' ? Math.max(500, opts.duration) : 2500
    const item = document.createElement('div')
    item.className = 'item'
    // 内联 check 图标 + 文本（textContent 设文本，SVG 无文本节点不影响播报）
    item.innerHTML = `${CHECK_ICON}<span class="toast-text"></span>`
    ;(item.querySelector('.toast-text') as HTMLElement).textContent = message
    item.addEventListener('click', () => close())
    this._viewport.appendChild(item)
    requestAnimationFrame(() => item.classList.add('visible'))

    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      item.classList.remove('visible')
      item.classList.add('leaving')
      setTimeout(() => item.remove(), 220)
    }
    setTimeout(close, duration)
    return close
  }
}
