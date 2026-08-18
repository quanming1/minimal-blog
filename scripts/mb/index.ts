/** mb：minimal-blog 文章 CLI（F1）——CRUD + 行号级编辑 + hash 乐观并发 + 锁互斥
 * 用法见 .ftre/skills/blog-cli/SKILL.md；设计 docs/prd/PRD-F1-blog-cli.md
 * 退出码：0 成功 / 1 用户错误 / 2 hash 冲突 / 3 锁或系统错误
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import {
  EXIT, acquireLock, applyEdit, atomicWrite, buildFrontmatter, contentHash, ensureDir,
  fmStructureOk, newPostText, parsePost, parseRange, postPath, postsDir, readFileAutoEncoding, readPost, requireRoot, serializePost, slugFromFilename, validSlug,
} from './lib'
import { publish } from './publish'

// argv 工具：取 flag 值 / 布尔存在性
function argVal(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return undefined
  const v = args[i + 1]
  if (v === undefined || v.startsWith('--')) return undefined
  return v
}
function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`)
}

function err(msg: string, code: number = EXIT.USER): never {
  console.error(`[mb] ${msg}`)
  process.exit(code)
}

function help(): void {
  console.log(`mb — minimal-blog 文章 CLI（F1）

用法：
  mb new <slug> [--title t] [--tags a,b] [--column c]    创建文章（date 自动今日带引号）
  mb list                                                文章列表（机器可读行）
  mb lines <slug> [--start N] [--end M]                  带行号输出正文（首行 hash: <h>，编辑前置）
  mb edit <slug> replace <N[:M]> --text s --hash <h>     替换行区间（1-based 闭区间）
  mb edit <slug> insert <N> --text s --hash <h>          第 N 行前插入
  mb edit <slug> delete <N[:M]> --hash <h>               删除行区间
  mb edit <slug> append --text s                         文末追加（无需 hash）
  mb meta <slug> get <field> | set <field> <value>       frontmatter 字段读写
  mb rm <slug> [--yes]                                   删除文章
  mb publish [--skip-verify] [--msg m]                   发布（验证→commit main→推 gh-pages→秒级上线）
  mb publish-file <路径> [--slug s] [--title t] [--tags a,b] [--column c] [--date d] [--no-publish] [--msg m] [--skip-verify]
                                                          整篇导入本地 .md/.txt 文件并发布（文件 frontmatter 优先，命令行补缺）
  mb --help

退出码：0 成功 · 1 用户错误 · 2 hash 冲突（重新 mb lines）· 3 锁被占/系统错误

agent 工作流（详见 .ftre/skills/blog-cli/SKILL.md）：
  new → lines → edit（带 hash）→ meta set → publish`)
}

// ── 子命令实现 ──

function cmdNew(args: string[]): void {
  const slug = args[0]
  if (!slug) err('用法: mb new <slug> [--title] [--tags] [--column]')
  if (!validSlug(slug)) err(`slug 非法: ${slug}（小写字母/数字/短横线，如 my-post）`)
  const root = requireRoot()
  const path = postPath(root, slug)
  if (existsSync(path)) err(`文章已存在: ${path}`)
  const title = argVal(args, 'title') ?? slug
  const tags = (argVal(args, 'tags') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const column = argVal(args, 'column')
  acquireLock(root, `new ${slug}`)
  ensureDir(postsDir(root))
  atomicWrite(path, newPostText(title, tags, column))
  console.log(`created: ${path}`)
  console.log(`next: mb lines ${slug} → mb edit ${slug} replace 5 --text "正文" --hash <hash>`)
}

function cmdList(): void {
  const root = requireRoot()
  const dir = postsDir(root)
  if (!existsSync(dir)) return
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const slug = f.replace(/\.md$/, '')
    const { fm } = parsePost(readPost(join(dir, f)))
    console.log([slug, fm.date ?? '-', fm.title ?? '-', fm.tags ?? '[]', fm.column ?? '-'].join('\t'))
  }
}

function cmdLines(args: string[]): void {
  const slug = args[0]
  if (!slug) err('用法: mb lines <slug>')
  const root = requireRoot()
  const path = postPath(root, slug)
  if (!existsSync(path)) err(`文章不存在: ${slug}（mb list 查看）`, EXIT.USER)
  const text = readPost(path)
  const lines = text.split('\n')
  console.log(`hash: ${contentHash(text)} （行数 ${lines.length}；编辑需带 --hash，冲突退出码 2）`)
  const start = Number(argVal(args, 'start') ?? 1)
  const end = Number(argVal(args, 'end') ?? lines.length)
  for (let i = start; i <= Math.min(end, lines.length); i++) {
    console.log(`${String(i).padStart(4)}|${lines[i - 1]}`)
  }
}

function cmdEdit(args: string[]): void {
  const slug = args[0]
  const op = args[1] as 'replace' | 'insert' | 'delete' | 'append'
  if (!slug || !op) err('用法: mb edit <slug> replace|insert|delete|append <N[:M]> [--text s] [--hash h]')
  const root = requireRoot()
  const path = postPath(root, slug)
  if (!existsSync(path)) err(`文章不存在: ${slug}`)
  const text = argVal(args, 'text')
  const hash = argVal(args, 'hash')
  const release = acquireLock(root, `edit ${slug}`)
  const cur = readPost(path)
  const curHash = contentHash(cur)
  let lines = cur.split('\n')

  if (op === 'append') {
    if (!text) err('--text 必填')
    const out = cur.endsWith('\n') ? cur + text + '\n' : cur + '\n' + text + '\n'
    atomicWrite(path, out)
    release()
    console.log(`appended（新 hash: ${contentHash(out)}）`)
    return
  }

  // 乐观并发：replace/insert/delete 必须带 hash 且一致
  if (!hash) err(`${op} 必须带 --hash（先 mb lines ${slug} 获取；防覆盖他人改动）`)
  if (hash !== curHash) err(`hash 冲突：文件已被修改（期望 ${hash}，实际 ${curHash}）——重新 mb lines 后再编辑`, EXIT.CONFLICT)

  if (op === 'replace' || op === 'delete') {
    if (!text && op === 'replace') err('replace 必须带 --text')
    const range = (() => { try { return parseRange(args[2] ?? '', lines.length) } catch (e) { err((e as Error).message) } })()
    // frontmatter 边界保护：编辑后首行 --- 与闭合 --- 结构必须完好
    const patched = applyEdit(lines, op, range, text)
    if (!fmStructureOk(patched)) err('该操作会破坏 frontmatter 结构（--- 边界）——改用 mb meta set 修改头部字段')
    lines = patched
  } else if (op === 'insert') {
    if (!text) err('insert 必须带 --text')
    const at = Number(args[2])
    if (!Number.isInteger(at) || at < 1 || at > lines.length + 1) err(`插入位置非法: ${args[2]}（1..${lines.length + 1}）`)
    lines = applyEdit(lines, 'insert', { start: at, end: at }, text)
  } else {
    err(`未知操作: ${op}`)
  }

  const out = lines.join('\n')
  atomicWrite(path, out)
  release()
  console.log(`edited: ${op}（新 hash: ${contentHash(out)}，行数 ${lines.length}）`)
}

function cmdMeta(args: string[]): void {
  const slug = args[0]
  const verb = args[1]
  if (!slug || !verb) err('用法: mb meta <slug> get|set <field> [value]')
  const root = requireRoot()
  const path = postPath(root, slug)
  if (!existsSync(path)) err(`文章不存在: ${slug}`)
  const text = readPost(path)
  const { bodyLines, fm } = parsePost(text)
  if (verb === 'get') {
    const field = args[2]
    if (!field) err('用法: mb meta <slug> get <field>')
    if (!(field in fm)) err(`字段不存在: ${field}（现有: ${Object.keys(fm).join(', ') || '无'}）`)
    console.log(fm[field])
    return
  }
  if (verb === 'set') {
    const field = args[2]
    const value = args.slice(3).join(' ')
    if (!field || !value) err('用法: mb meta <slug> set <field> <value>')
    const release = acquireLock(root, `meta ${slug}`)
    // date 自动补引号（YAML 裸日期陷阱）；title 含冒号自动补引号
    let v = value
    if (field === 'date') v = /^'.*'$/.test(v) ? v : `'${v}'`
    if (field === 'title' && /:\s/.test(v) && !/^'.*'$/.test(v)) v = `'${v}'`
    fm[field] = v
    atomicWrite(path, serializePost(fm, bodyLines.join('\n')))
    release()
    console.log(`set ${field}: ${v}`)
    return
  }
  err(`未知动词: ${verb}（get/set）`)
}

function cmdRm(args: string[]): void {
  const slug = args[0]
  if (!slug) err('用法: mb rm <slug> [--yes]')
  const root = requireRoot()
  const path = postPath(root, slug)
  if (!existsSync(path)) err(`文章不存在: ${slug}`)
  if (!hasFlag(args, 'yes')) {
    console.log(`将删除: ${path}`)
    console.log(`若该文章有资产目录 public/assets/${slug}/，请一并处理（rm 不自动删资产）`)
    err('确认请加 --yes')
  }
  const release = acquireLock(root, `rm ${slug}`)
  rmSync(path)
  release()
  console.log(`deleted: ${path}（资产目录请自查 public/assets/${slug}/）`)
}

function cmdPublishFile(args: string[]): void {
  const pathArg = args[0]
  if (!pathArg) err('用法: mb publish-file <路径> [--slug s] [--title t] [--tags a,b] [--column c] [--date d] [--no-publish] [--msg m] [--skip-verify]')
  const root = requireRoot()

  const abs = resolve(pathArg)
  if (!existsSync(abs) || !statSync(abs).isFile()) err(`文件不存在或不是文件: ${pathArg}`)
  const ext = extname(abs).toLowerCase()
  if (ext !== '.md' && ext !== '.txt') err(`仅支持 .md/.txt 文件: ${pathArg}`)

  const slug = argVal(args, 'slug') ?? slugFromFilename(basename(abs))
  if (!validSlug(slug)) err(`slug 非法: "${slug}"（中文/空文件名请用 --slug 指定小写短横线）`)
  const target = postPath(root, slug)
  if (existsSync(target)) err(`文章已存在: ${slug}（先 mb rm 或换 --slug）`)

  const content = readFileAutoEncoding(abs)
  const { fm, bodyLines } = parsePost(content)

  let merged: Record<string, string>
  try {
    merged = buildFrontmatter(fm, {
      title: argVal(args, 'title'),
      date: argVal(args, 'date'),
      tags: argVal(args, 'tags'),
      column: argVal(args, 'column'),
    })
  } catch (e) {
    err((e as Error).message)
  }

  {
    const release = acquireLock(root, `publish-file ${slug}`)
    ensureDir(postsDir(root))
    atomicWrite(target, serializePost(merged, bodyLines.join('\n')))
    release()
  }
  console.log(`导入: ${target}`)

  if (hasFlag(args, 'no-publish')) {
    console.log('已跳过发布（--no-publish）。手动发布: mb publish')
    return
  }

  const pubArgs: string[] = []
  const msg = argVal(args, 'msg')
  if (msg) pubArgs.push('--msg', msg)
  if (hasFlag(args, 'skip-verify')) pubArgs.push('--skip-verify')
  publish(pubArgs, { requireRoot, acquireLock })
}

// ── 入口 ──
const [cmd, ...rest] = process.argv.slice(2)
switch (cmd) {
  case undefined:
  case '--help':
  case '-h':
  case 'help': help(); break
  case 'new': cmdNew(rest); break
  case 'list': cmdList(); break
  case 'lines': cmdLines(rest); break
  case 'edit': cmdEdit(rest); break
  case 'meta': cmdMeta(rest); break
  case 'rm': cmdRm(rest); break
  case 'publish': publish(rest, { requireRoot, acquireLock }); break
  case 'publish-file': cmdPublishFile(rest); break
  default: err(`未知命令: ${cmd}（mb --help 查看）`)
}
