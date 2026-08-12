/** Markdown 拓展公共工具（src/markdown/remark/ 内共享）
 * escapeHtml：mdast html 节点【原样输出不转义】——文本级插件（highlight/supsub）必须手动转义。
 * 顺序敏感：& 最先，再 < > "（防止二次转义与属性注入）。
 */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
