/** mb CLI 公共库：仓库定位 / 文章路径 / frontmatter / hash 乐观并发 / 文件锁 / 原子写 / 行号编辑纯函数
 * 零依赖（Bun 内置），单测见 mb.test.ts。设计见 docs/prd/PRD-F1-blog-cli.md。
 */
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

// ── 退出码约定（agent 友好）：0 成功 / 1 用户错误 / 2 hash 冲突 / 3 锁或系统错误 ──
export const EXIT = { OK: 0, USER: 1, CONFLICT: 2, SYSTEM: 3 } as const

/** 从 cwd 向上定位仓库根（找 package.json 且 name 为 minimal-blog） */
export function findRepoRoot(start: string = process.cwd()): string | null {
  let dir = start
  for (;;) {
    const pkg = join(dir, 'package.json')
    if (existsSync(pkg)) {
      try {
        const name = JSON.parse(readFileSync(pkg, 'utf8')).name
        if (name === 'minimal-blog') return dir
      } catch { /* 非法 json 继续向上 */ }
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function requireRoot(): string {
  const root = findRepoRoot()
  if (!root) {
    console.error('[mb] 未找到 minimal-blog 仓库（从当前目录向上找 package.json）——请在仓库内运行，或先 clone')
    process.exit(EXIT.USER)
  }
  return root
}

export const postsDir = (root: string) => join(root, 'src', 'content', 'posts', 'zh')
export const postPath = (root: string, slug: string) => join(postsDir(root), `${slug}.md`)

/** slug 校验：小写字母/数字/短横线，防路径逃逸 */
export function validSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !slug.includes('..')
}

// ── hash 乐观并发：全文 sha256 前 12 hex ──
export function contentHash(text: string): string {
  const h = new Bun.CryptoHasher('sha256')
  h.update(text)
  return h.digest('hex').slice(0, 12)
}

// ── 原子写：tmp + rename（防写一半被读到）──
export function atomicWrite(path: string, text: string): void {
  const tmp = `${path}.tmp-${process.pid}`
  writeFileSync(tmp, text, { flag: 'wx' })
  renameSync(tmp, path)
}

// ── 文件锁：写操作互斥（PID + 时间戳，TTL 超时回收，进程退出释放）──
const LOCK_NAME = '.mb-lock'
const LOCK_TTL_MS = 5 * 60 * 1000

export interface LockInfo { pid: number; ts: number; op: string }

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    // POSIX 语义：EPERM = 进程存在但无权限（Windows 跨进程常见）；ESRCH = 不存在
    const code = (e as NodeJS.ErrnoException).code
    if (code === 'EPERM') return true
    return false
  }
}

/** 抢锁；成功返回释放函数，失败（被占）exit 3 */
export function acquireLock(root: string, op: string): () => void {
  const lockPath = join(root, LOCK_NAME)
  if (existsSync(lockPath)) {
    let info: LockInfo | null = null
    try { info = JSON.parse(readFileSync(lockPath, 'utf8')) } catch { /* 损坏视为可回收 */ }
    const alive = info !== null && Date.now() - info.ts <= LOCK_TTL_MS && pidAlive(info.pid)
    if (alive && info) {
      console.error(`[mb] 仓库正被其他操作占用（pid=${info.pid}，op=${info.op}，${Math.round((Date.now() - info.ts) / 1000)}s 前）。稍后重试，或确认该进程已死后删除 ${LOCK_NAME}`)
      process.exit(EXIT.SYSTEM)
    }
    // 过期 / 损坏 / 持锁进程已死 → 回收
    unlinkSync(lockPath)
  }
  const info: LockInfo = { pid: process.pid, ts: Date.now(), op }
  atomicWrite(lockPath, JSON.stringify(info))
  const release = () => { try { unlinkSync(lockPath) } catch { /* 已被回收 */ } }
  process.on('exit', release)
  process.on('SIGINT', () => { release(); process.exit(130) })
  process.on('SIGTERM', () => { release(); process.exit(143) })
  return release
}

// ── frontmatter 解析/序列化（浅层 key: value + 行内数组；date 保持引号）──
export interface ParsedPost { fmLines: string[]; bodyLines: string[]; fm: Record<string, string> }

export function parsePost(text: string): ParsedPost {
  const lines = text.split('\n')
  if (lines[0]?.trim() !== '---') return { fmLines: [], bodyLines: lines, fm: {} }
  const end = lines.indexOf('---', 1)
  if (end === -1) return { fmLines: [], bodyLines: lines, fm: {} }
  const fmLines = lines.slice(0, end + 1)
  const bodyLines = lines.slice(end + 1)
  const fm: Record<string, string> = {}
  for (const l of fmLines.slice(1, -1)) {
    const m = l.match(/^(\w[\w-]*):\s*(.*)$/)
    if (m) fm[m[1]] = m[2]
  }
  return { fmLines, bodyLines, fm }
}

/** frontmatter 结构完整性：首行 --- 与闭合 --- 必须存在（行编辑保护边界） */
export function fmStructureOk(lines: string[]): boolean {
  if (lines[0]?.trim() !== '---') return false
  const end = lines.indexOf('---', 1)
  return end !== -1 && end > 1
}

export function serializePost(fm: Record<string, string>, bodyText: string): string {
  const order = ['title', 'date', 'description', 'column', 'tags']
  const keys = [...order.filter((k) => k in fm), ...Object.keys(fm).filter((k) => !order.includes(k))]
  const fmStr = keys.map((k) => `${k}: ${fm[k]}`).join('\n')
  const body = bodyText.replace(/^\n+/, '')
  return `---\n${fmStr}\n---\n${body}`
}

// ── 行号区间解析与编辑纯函数（1-based，闭区间）──
export function parseRange(spec: string, total: number): { start: number; end: number } {
  const m = spec.match(/^(\d+)(?::(\d+))?$/)
  if (!m) throw new Error(`区间格式错误: "${spec}"（应为 N 或 N:M）`)
  const start = Number(m[1])
  const end = m[2] ? Number(m[2]) : start
  if (start < 1 || end < start) throw new Error(`区间非法: ${spec}（1-based，start <= end）`)
  if (end > total) throw new Error(`区间越界: ${spec}（文件共 ${total} 行）`)
  return { start, end }
}

export function applyEdit(
  lines: string[],
  op: 'replace' | 'insert' | 'delete',
  range: { start: number; end: number },
  text?: string,
): string[] {
  const ins = text === undefined ? [] : text.split('\n')
  const s = range.start - 1
  const e = range.end // exclusive
  switch (op) {
    case 'replace': return [...lines.slice(0, s), ...ins, ...lines.slice(e)]
    case 'insert': return [...lines.slice(0, s), ...ins, ...lines.slice(s)]
    case 'delete': return [...lines.slice(0, s), ...lines.slice(e)]
  }
}

/** 今日日期字符串（本地时区） */
export function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 文章模板 */
export function newPostText(title: string, tags: string[], column?: string): string {
  const fm: Record<string, string> = {
    title: title.includes(':') ? `'${title}'` : title,
    date: `'${today()}'`, // 引号：YAML 裸日期陷阱（AGENTS.md）
  }
  if (column) fm.column = column
  if (tags.length) fm.tags = `[${tags.join(', ')}]`
  return serializePost(fm, '\n正文从这里开始。\n')
}

/** 读文章（存在性 + BOM 防呆） */
export function readPost(path: string): string {
  let raw = readFileSync(path, 'utf8')
  if (raw.charCodeAt(0) === 0xfeff) {
    console.error('[mb] 文件带 UTF-8 BOM（会渲染空白正文）——已自动剥离并写回')
    raw = raw.slice(1)
    atomicWrite(path, raw)
  }
  return raw
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}
