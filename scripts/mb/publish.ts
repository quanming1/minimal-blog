/** mb publish：秒级发布（F2）——本地 build → commit main 源码 → push main（触发 CI 非阻塞验证）
 * → 推 dist 到 gh-pages 产物分支（Pages 从该分支 serve，无 CI 构建，秒级可见）。
 * 全程持仓库锁；设计见 docs/prd/PRD-F2-fast-publish.md（回退预案见该 PRD §3）。
 */
import { spawnSync } from 'node:child_process'
import { rmSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

interface Deps {
  requireRoot: () => string
  acquireLock: (root: string, op: string) => () => void
}

function run(cmd: string, args: string[], opts: { cwd: string; timeoutMs?: number } ): { code: number; out: string } {
  const useShell = process.platform === 'win32'
  const quoted = useShell
    ? [cmd, ...args.map((a) => (/[^\w@%+=:,./-]/.test(a) ? `"${a}"` : a))].join(' ')
    : undefined
  const r = spawnSync(useShell ? quoted! : cmd, useShell ? [] : args, {
    cwd: opts.cwd,
    encoding: 'utf8',
    shell: useShell,
    timeout: opts.timeoutMs ?? 10 * 60 * 1000,
  })
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

function fail(msg: string, code: number): never {
  console.error(`[mb publish] ${msg}`)
  process.exit(code)
}

function copyDir(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true })
  for (const f of readdirSync(src)) {
    const s = join(src, f)
    const d = join(dst, f)
    if (statSync(s).isDirectory()) copyDir(s, d)
    else copyFileSync(s, d)
  }
}

/** 推 dist 到 gh-pages 分支（worktree + force push + .nojekyll） */
function pushGhPages(root: string): void {
  const wt = join(root, '.ghpages-worktree')
  const dist = join(root, 'dist')
  // 清理旧 worktree（-B 会复用/重置分支；先移除再重建，避免残留冲突）
  run('git', ['worktree', 'remove', '--force', wt], { cwd: root })
  run('git', ['worktree', 'prune'], { cwd: root })
  rmSync(wt, { recursive: true, force: true })

  const add = run('git', ['worktree', 'add', '-B', 'gh-pages', wt, 'HEAD'], { cwd: root })
  if (add.code !== 0) fail(`创建 gh-pages worktree 失败: ${add.out}`, 3)

  // 清空 worktree（保留 .git），写入 dist 产物 + .nojekyll
  for (const f of readdirSync(wt)) {
    if (f === '.git') continue
    rmSync(join(wt, f), { recursive: true, force: true })
  }
  copyDir(dist, wt)
  writeFileSync(join(wt, '.nojekyll'), '')

  const c1 = run('git', ['add', '-A'], { cwd: wt })
  if (c1.code !== 0) fail(`gh-pages git add 失败: ${c1.out}`, 3)
  const c2 = run('git', ['commit', '--allow-empty', '-m', `publish: ${Date.now()}`], { cwd: wt })
  if (c2.code !== 0) fail(`gh-pages commit 失败: ${c2.out}`, 3)
  const p1 = run('git', ['push', '--force', 'origin', 'gh-pages'], { cwd: wt })
  if (p1.code !== 0) fail(`gh-pages push 失败: ${p1.out}`, 3)

  run('git', ['worktree', 'remove', '--force', wt], { cwd: root })
  run('git', ['worktree', 'prune'], { cwd: root })
  rmSync(wt, { recursive: true, force: true })
}

export function publish(args: string[], deps: Deps): void {
  const skipVerify = args.includes('--skip-verify')
  const msgIdx = args.indexOf('--msg')
  const userMsg = msgIdx !== -1 ? args[msgIdx + 1] : undefined

  const root = deps.requireRoot()
  const release = deps.acquireLock(root, 'publish')

  try {
    // 0. 工作区干净检查
    const st = run('git', ['status', '--porcelain'], { cwd: root })
    if (st.code !== 0) fail(`git status 失败: ${st.out}`, 3)
    if (st.out.trim() === '') {
      console.log('工作区干净，无需发布')
      release()
      return
    }

    // 1. 验证链（build 必须；lint/test 可 --skip-verify 跳过）
    if (!skipVerify) {
      for (const s of ['lint', 'test', 'build']) {
        console.log(`[1/4] 验证: bun run ${s} ...`)
        const r = run('bun', ['run', s], { cwd: root })
        if (r.code !== 0) fail(`bun run ${s} 失败（详见上方输出）——修复后再发布`, 1)
      }
    } else {
      console.log('[1/4] 跳过 lint/test（--skip-verify），仅 build ...')
      const b = run('bun', ['run', 'build'], { cwd: root })
      if (b.code !== 0) fail(`bun run build 失败: ${b.out}`, 1)
    }

    // 2. commit main 源码（历史可追溯；hook 校验）
    // 先 add 再取 staged 文件名——git diff --name-only HEAD 不含 untracked 新文件（新文章会漏）
    const add = run('git', ['add', '-A'], { cwd: root })
    if (add.code !== 0) fail(`git add 失败: ${add.out}`, 3)
    const diff = run('git', ['diff', '--cached', '--name-only', 'HEAD'], { cwd: root })
    const posts = diff.out.split('\n').filter((l) => l.includes('src/content/posts/'))
    let msg = userMsg
    if (!msg) {
      const slugs = [...new Set(posts.map((p) => p.split('/').pop()?.replace(/\.md$/, '')))]
      msg = posts.length > 0 ? `post(posts): 文章更新（${slugs.join(', ')}）` : 'chore(release): 工程变更发布'
    }
    console.log(`[2/4] 提交 main 源码: ${msg}`)
    const cm = run('git', ['commit', '-m', msg], { cwd: root })
    if (cm.code !== 0) fail(`commit 失败（hook 拒绝或无变更）: ${cm.out}`, 1)

    // 3. push main 源码（触发 CI lint+test 验证，非阻塞部署）
    console.log('[3/4] 推送 main 源码 ...')
    let ps = run('git', ['push', 'origin', 'main'], { cwd: root })
    if (ps.code !== 0) {
      console.log('  push 失败（可能有并发推送），pull --rebase 后重试一次 ...')
      const pull = run('git', ['pull', '--rebase', 'origin', 'main'], { cwd: root })
      if (pull.code !== 0) fail(`pull --rebase 失败（冲突需手工解决）: ${pull.out}`, 3)
      ps = run('git', ['push', 'origin', 'main'], { cwd: root })
      if (ps.code !== 0) fail(`重试 push 仍失败: ${ps.out}`, 3)
    }

    // 4. 推 gh-pages 产物分支 → Pages 秒级 serve
    console.log('[4/4] 推 gh-pages 产物（秒级发布）...')
    pushGhPages(root)

    console.log('发布完成（main 源码 + gh-pages 产物已推送，线上秒级生效）。')
  } finally {
    release()
  }
}
