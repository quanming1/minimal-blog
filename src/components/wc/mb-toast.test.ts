import '../../test/setup-dom' // jsdom globals（必须最先，见 docs/ui-analysis.md §11.7）
import { beforeAll, describe, expect, test } from 'bun:test'
import { MbToast } from './mb-toast'

beforeAll(() => {
  if (!customElements.get('mb-toast')) customElements.define('mb-toast', MbToast)
})

describe('mb-toast', () => {
  test('自定义元素注册成功', () => {
    expect(customElements.get('mb-toast')).toBe(MbToast)
  })

  test('show 创建条目（viewport 承担 aria-live 播报）', () => {
    const el = document.createElement('mb-toast') as MbToast
    document.body.appendChild(el)
    const close = el.show('已复制')
    const viewport = el.shadowRoot?.querySelector('.viewport')
    const items = el.shadowRoot?.querySelectorAll('.item')
    expect(viewport?.getAttribute('aria-live')).toBe('polite')
    expect(items?.length).toBe(1)
    expect(items?.[0]?.textContent).toBe('已复制')
    expect(items?.[0]?.getAttribute('role')).toBeNull() // item 不重复播报
    expect(typeof close).toBe('function')
    document.body.removeChild(el)
  })

  test('多条 show 垂直堆叠', () => {
    const el = document.createElement('mb-toast') as MbToast
    document.body.appendChild(el)
    el.show('A')
    el.show('B')
    expect(el.shadowRoot?.querySelectorAll('.item').length).toBe(2)
    document.body.removeChild(el)
  })

  test('close 函数立即关闭单条', () => {
    const el = document.createElement('mb-toast') as MbToast
    document.body.appendChild(el)
    const close = el.show('A')
    close()
    // leaving 后 220ms 移除（jsdom 同步推进 setTimeout）
    expect(el.shadowRoot?.querySelectorAll('.item').length).toBe(1) // 仍挂着（leaving）
    document.body.removeChild(el)
  })

  test('duration 下限 500ms（0/负值不立即消失）', () => {
    const el = document.createElement('mb-toast') as MbToast
    document.body.appendChild(el)
    el.show('A', { duration: 0 })
    el.show('B', { duration: -100 })
    expect(el.shadowRoot?.querySelectorAll('.item').length).toBe(2)
    document.body.removeChild(el)
  })
})
