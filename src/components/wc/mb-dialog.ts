/** mb-dialog：通用模态弹层（Web Component，见 docs/ui-analysis.md §11.2）
 * - open 属性控制显隐（存在即打开）
 * - focus trap：Tab/Shift+Tab 循环；打开时聚焦面板；关闭时焦点归还触发者
 * - Escape 关闭（派发 mb-dialog-close 事件，preventDefault 可阻止）
 * - 点击遮罩关闭
 * - body 滚动锁定（保存原值，VT 卸载时恢复）
 * - role=dialog + aria-modal + aria-label（label 属性）
 * 主题：CSS 变量继承（--bg/--text/--accent/--divider/--muted），零 JS 同步
 */

const STYLE = `
  :host {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding: 12vh 1em 1em;
    background: var(--overlay, rgba(0, 0, 0, 0.35));
  }
  :host([open]) {
    display: flex;
  }
  .panel {
    width: min(34em, 100%);
    max-height: 70vh;
    overflow-y: auto;
    background: var(--bg, #fff);
    color: var(--text, #333);
    border: 1px solid var(--divider, rgba(0,0,0,.3));
    padding: 1.2em 1.4em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); /* 克制：遮罩已分层，阴影仅轻微提升 */
  }
  ::slotted(*) {
    /* 面板内容由调用方负责布局，这里仅兜底边距 */
  }
  @media (prefers-reduced-motion: reduce) {
    :host { transition: none !important; }
  }
`

const TEMPLATE = `
  <style>${STYLE}</style>
  <div class="panel" part="panel" role="dialog" aria-modal="true" tabindex="-1">
    <slot></slot>
  </div>
`

export class MbDialog extends HTMLElement {
  static observedAttributes = ['open', 'label']

  private _lastFocused: HTMLElement | null = null
  private _prevBodyOverflow: string | null = null
  private _panel!: HTMLElement
  private _focusableSel = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    shadow.innerHTML = TEMPLATE
    this._panel = shadow.querySelector('.panel') as HTMLElement
  }

  connectedCallback() {
    this._panel.setAttribute('aria-label', this.getAttribute('label') ?? '')
    this.addEventListener('keydown', this._onKeydown)
    this.addEventListener('click', this._onClick)
    if (this.hasAttribute('open')) this._show()
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('click', this._onClick)
    this._restoreScroll()
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'open') {
      if (value !== null) this._show()
      else this._hide()
    } else if (name === 'label') {
      this._panel?.setAttribute('aria-label', value ?? '')
    }
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (!this.hasAttribute('open')) return
    if (e.key === 'Escape') {
      this._requestClose()
      return
    }
    if (e.key === 'Tab') {
      this._trapFocus(e)
    }
  }

  private _onClick = (e: MouseEvent) => {
    // 点击遮罩（host 自身）关闭：composedPath()[0] 才是真实事件源
    // （shadow 树内事件冒泡到 host 时 target 会被 retarget 为 host，点面板内也会误判）
    if (e.composedPath()[0] === this) this._requestClose()
  }

  private _requestClose() {
    const ev = new CustomEvent('mb-dialog-close', { bubbles: true, composed: true, cancelable: true })
    if (this.dispatchEvent(ev)) this.removeAttribute('open')
  }

  private _show() {
    if (this._prevBodyOverflow === null) {
      this._prevBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    this._lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    requestAnimationFrame(() => {
      // 可聚焦元素从 host 收集（light DOM / slot 内容，shadow 内 querySelector 查不到）
      const first = this.querySelector<HTMLElement>(this._focusableSel)
      if (first) first.focus()
      else this._panel.focus()
    })
  }

  private _hide() {
    this._restoreScroll()
    // 焦点归还（元素可能已被 VT 移除，安全兜底）
    if (this._lastFocused && this._lastFocused.isConnected) this._lastFocused.focus()
    this._lastFocused = null
  }

  /** 恢复 body 滚动锁定（幂等：null 哨兵避免与 '' 初始值混淆） */
  private _restoreScroll() {
    if (this._prevBodyOverflow !== null) {
      document.body.style.overflow = this._prevBodyOverflow
      this._prevBodyOverflow = null
    }
  }

  /** 可见性判断：真实浏览器用 offsetParent/getClientRects（布局），jsdom 无布局时退化为 DOM 级检查 */
  private _isVisible(el: HTMLElement): boolean {
    if (el.offsetParent !== null || el.getClientRects().length > 0) return true
    return el.closest('[hidden]') === null && getComputedStyle(el).display !== 'none'
  }

  private _trapFocus(e: KeyboardEvent) {
    // 从 host 收集（light DOM / slot 内容）；focusables 为空时锁焦点在面板内
    const focusables = Array.from(this.querySelectorAll<HTMLElement>(this._focusableSel)).filter((el) =>
      this._isVisible(el),
    )
    if (focusables.length === 0) {
      e.preventDefault()
      this._panel.focus()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (e.shiftKey) {
      if (active === first || !this.contains(active)) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last || !this.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}
