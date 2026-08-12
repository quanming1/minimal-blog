/** HTML 内联 JSON 序列化（构建期纯函数）
 *
 * 序列化任意值并全量转义 `<` 为 `\u003c`——覆盖 `</script>` 与 `<!--` 两种 script 注入向量。
 * `\u003c` 是合法 JSON 转义，JSON.parse 可还原。
 *
 * 用途：JSON-LD（seo.ts serializeJsonLd）与搜索索引（search.ts serializeIndexForHtml）
 * 注入 HTML 前都必须经过本函数（Astro 对非 JS script 透传不求值，见 docs/seo.md §2.2）。
 */
export function serializeJsonForHtml(value: unknown): string {
  // '\\u003c'：字符串字面量为 \u003c（6 字符），JSON 合法转义
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
