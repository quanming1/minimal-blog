/** remark-parse 类型声明：npm 包 files 声明含根 index.d.ts 但实际未发布（缺失），
 * lib/index.d.ts 存在但 exports 字符串形式无 types 条件，TS 解析不到 → 项目内声明兜底。
 * 若未来包修复可删除本文件。
 */
declare module 'remark-parse' {
  import type { Pluggable } from 'unified'
  const remarkParse: Pluggable
  export default remarkParse
}
