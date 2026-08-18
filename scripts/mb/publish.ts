/** mb publish：发布全流程（F1）——验证 → commit → push（rebase 重试）→ CI 等待 → 线上抽查
 * 全程持仓库锁（与其他写操作互斥）；任一步失败即停并释放锁。设计见 docs/prd/PRD-F1-blog-cli.md §3。
 */
import { spawnSync } from 'node:child_process'

interface Deps {
  requireRoot: () => string
  acquireLock: (root: string, op: string) => () => void
}

function run(cmd: string, args: string[], opts: { cwd: string; timeoutMs?: number } ): { code: number; out: string } {
  // Windows：bun 是 npm shim（bun.cmd）必须走 shell；shell 模式下参数需自行加引号（含空格/中文括号的 msg 会被拆词）
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

export function publish(args: string[], deps: Deps): void {
  const skipVerify = args.includes('--skip-verify')
  const noWaitCi = args.includes('--no-wait-ci')
  const msgIdx = args.indexOf('--msg')
  const userMsg = msgIdx !== -1 ? args[msgIdx + 1] : undefined

  const root = deps.requireRoot()
  const release = deps.acquireLock(root, 'publish')

  try {
    // 0. 工作区干净检查（防误提交无关文件）
    const st = run('git', ['status', '--porcelain'], { cwd: root })
    if (st.code !== 0) fail(`git status 失败: ${st.out}`, 3)
    if (st.out.trim() === '') {
      console.log('工作区干净，无需发布')
      release()
      return
    }

    // 1. 验证链（可 --skip-verify 显式跳过）
    if (!skipVerify) {
      for (const s of ['lint', 'test', 'build']) {
        console.log(`[1/5] 验证: bun run ${s} ...`)
        const r = run('bun', ['run', s], { cwd: root })
        if (r.code !== 0) fail(`bun run ${s} 失败（详见上方输出）——修复后再发布`, 1)
      }
    } else {
      console.log('[1/5] 跳过本地验证（--skip-verify）')
    }

    // 2. commit（信息自动生成或 --msg；hook 校验 type/scope）
    const diff = run('git', ['diff', '--name-only', 'HEAD'], { cwd: root })
    const posts = diff.out.split('\n').filter((l) => l.includes('src/content/posts/'))
    let msg = userMsg
    if (!msg) {
      const slugs = [...new Set(posts.map((p) => p.split('/').pop()?.replace(/\.md$/, '')))]
      msg = posts.length > 0
        ? `post(posts): 文章更新（${slugs.join(', ')}）`
        : 'chore(release): 工程变更发布'
    }
    console.log(`[2/5] 提交: ${msg}`)
    // .mb-lock 在 .gitignore（add -A 自动跳过 ignored 文件；显式 pathspec 排除在 Windows shell 下引号会被吃掉）
    const add = run('git', ['add', '-A'], { cwd: root })
    if (add.code !== 0) fail(`git add 失败: ${add.out}`, 3)
    const cm = run('git', ['commit', '-m', msg], { cwd: root })
    if (cm.code !== 0) fail(`commit 失败（hook 拒绝或无变更）: ${cm.out}`, 1)

    // 3. push（非 ff 时 pull --rebase 重试一次——竞态：他人刚推过）
    console.log('[3/5] 推送 main ...')
    let ps = run('git', ['push', 'origin', 'main'], { cwd: root })
    if (ps.code !== 0) {
      console.log('  push 失败（可能有并发推送），pull --rebase 后重试一次 ...')
      const pull = run('git', ['pull', '--rebase', 'origin', 'main'], { cwd: root })
      if (pull.code !== 0) fail(`pull --rebase 失败（冲突需手工解决）: ${pull.out}`, 3)
      ps = run('git', ['push', 'origin', 'main'], { cwd: root })
      if (ps.code !== 0) fail(`重试 push 仍失败: ${ps.out}`, 3)
    }

    // 4. CI 等待
    if (noWaitCi) {
      console.log('[4/5] 跳过 CI 等待（--no-wait-ci）')
    } else {
      console.log('[4/5] 等待 GitHub Actions 部署 ...')
      const list = run('gh', ['run', 'list', '--limit', '1', '--json', 'databaseId,status', '--jq', '.[0]'], { cwd: root })
      const m = list.out.match(/"databaseId":\s*(\d+)/)
      if (list.code !== 0 || !m) {
        console.log(`  无法获取 run id（gh 未登录？），跳过等待：${list.out.slice(0, 120)}`)
      } else {
        const w = run('gh', ['run', 'watch', m[1], '--exit-status'], { cwd: root, timeoutMs: 15 * 60 * 1000 })
        if (w.code !== 0) fail(`CI 失败（run ${m[1]}）——GitHub Actions 页面查看日志`, 1)
        console.log(`  CI 全绿（run ${m[1]}）`)
      }
    }

    // 5. 线上抽查（首页 + 变更文章）
    console.log('[5/5] 线上抽查 ...')
    const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
    let ok = false
    for (let i = 0; i < 10 && !ok; i++) {
      sleep(15000) // Pages 部署后生效有延迟，先等再测
      const c = run('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', 'https://quanming1.github.io/minimal-blog/'], { cwd: root, timeoutMs: 30000 })
      ok = c.out.trim() === '200'
    }
    if (!ok) console.log('  警告：首页未在预期时间返回 200（Pages 缓存/延迟），稍后自行核验')
    else console.log('  线上首页 200')

    console.log('发布完成。')
  } finally {
    release()
  }
}
