import { describe, expect, it } from 'bun:test'
import { t } from './i18n'

describe('i18n 字典', () => {
  it('zh 默认文案', () => {
    expect(t('zh', 'siteName')).toBe('明志')
    expect(t('zh', 'navPosts')).toBe('文章')
    expect(t('zh', 'switchLang')).toBe('EN')
  })

  it('en 文案', () => {
    expect(t('en', 'siteName')).toBe('Mingzhi')
    expect(t('en', 'navPosts')).toBe('Posts')
    expect(t('en', 'switchLang')).toBe('中文')
  })

  it('占位符替换', () => {
    expect(t('zh', 'minRead', { n: 4 })).toBe('约 4 分钟')
    expect(t('en', 'minRead', { n: 3 })).toBe('3 min. read')
  })

  it('所有 key 双语言均有值', () => {
    const keys = ['siteName', 'tagline', 'navHome', 'navPosts', 'navAbout', 'switchLang',
      'postsTitle', 'aboutTitle', 'firstWritten', 'minRead', 'allPosts', 'backHome',
      'footerNote', 'emailLabel'] as const
    for (const k of keys) {
      expect(t('zh', k).length).toBeGreaterThan(0)
      expect(t('en', k).length).toBeGreaterThan(0)
    }
  })
})
