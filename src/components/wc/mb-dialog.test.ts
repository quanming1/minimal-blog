import '../../test/setup-dom' // jsdom globals（必须最先，见 docs/ui-analysis.md §11.7）
import { beforeAll, describe, expect, test } from 'bun:test'
import { MbDialog } from './mb-dialog'

beforeAll(() => {
  // 测试独立于 wc/index.ts 注册入口，显式注册被测组件
  if (!customElements.get('mb-dialog')) customElements.define('mb-dialog', MbDialog)
})

describe('mb-dialog', () => {
  test('自定义元素注册成功', () => {
    expect(customElements.get('mb-dialog')).toBe(MbDialog)
  })

  test('shadowRoot 渲染面板（role=dialog + aria-modal）', () => {
    const el = document.createElement('mb-dialog')
    document.body.appendChild(el)
    const panel = el.shadowRoot?.querySelector('.panel')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('role')).toBe('dialog')
    expect(panel?.getAttribute('aria-modal')).toBe('true')
    document.body.removeChild(el)
  })

  test('open 属性控制显隐状态', () => {
    const el = document.createElement('mb-dialog') as MbDialog
    document.body.appendChild(el)
    expect(el.hasAttribute('open')).toBe(false)
    el.setAttribute('open', '')
    expect(el.hasAttribute('open')).toBe(true)
    el.removeAttribute('open')
    expect(el.hasAttribute('open')).toBe(false)
    // 关闭后 body 滚动恢复
    expect(document.body.style.overflow).toBe('')
    document.body.removeChild(el)
  })

  test('Escape 关闭并派发 mb-dialog-close（cancelable）', () => {
    const el = document.createElement('mb-dialog') as MbDialog
    document.body.appendChild(el)
    el.setAttribute('open', '')
    let closed = 0
    el.addEventListener('mb-dialog-close', () => closed++)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(closed).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
    document.body.removeChild(el)
  })

  test('preventDefault 可阻止关闭', () => {
    const el = document.createElement('mb-dialog') as MbDialog
    document.body.appendChild(el)
    el.setAttribute('open', '')
    el.addEventListener('mb-dialog-close', (e) => e.preventDefault())
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.hasAttribute('open')).toBe(true)
    document.body.removeChild(el)
  })

  test('点击遮罩（host 自身）触发关闭', () => {
    const el = document.createElement('mb-dialog') as MbDialog
    document.body.appendChild(el)
    el.setAttribute('open', '')
    let closed = 0
    el.addEventListener('mb-dialog-close', () => closed++)
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(closed).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
    document.body.removeChild(el)
  })

  test('点击面板内部（slot 内容）不关闭（composedPath 判定）', () => {
    const el = document.createElement('mb-dialog') as MbDialog
    el.innerHTML = '<input type="text" />'
    document.body.appendChild(el)
    el.setAttribute('open', '')
    let closed = 0
    el.addEventListener('mb-dialog-close', () => closed++)
    const input = el.querySelector('input')
    input?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(closed).toBe(0)
    expect(el.hasAttribute('open')).toBe(true)
    document.body.removeChild(el)
  })

  test('focus trap：Tab 在 light DOM 元素间循环（不逃逸到背景）', () => {
    const el = document.createElement('mb-dialog') as MbDialog
    el.innerHTML = '<input id="a" type="text" /><button id="b">Go</button>'
    document.body.appendChild(el)
    el.setAttribute('open', '')
    const a = el.querySelector('#a') as HTMLInputElement
    const b = el.querySelector('#b') as HTMLButtonElement
    a.focus()
    // 在最后一个元素上按 Tab → 循环回第一个
    b.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(a)
    // Shift+Tab 从第一个 → 循环到最后一个
    a.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(b)
    document.body.removeChild(el)
  })

  test('disconnectedCallback 清理并恢复滚动锁定', () => {
    const el = document.createElement('mb-dialog') as MbDialog
    document.body.appendChild(el)
    el.setAttribute('open', '')
    expect(document.body.style.overflow).toBe('hidden')
    document.body.removeChild(el) // disconnectedCallback
    expect(document.body.style.overflow).toBe('')
  })
})
