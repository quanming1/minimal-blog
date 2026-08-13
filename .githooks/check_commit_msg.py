"""commit-msg 校验逻辑（minimal-blog 版，从 rondo 迁移适配，规则见 AGENTS.md 提交规范节）。

由 .githooks/commit-msg（sh 包装）调用，从提交消息文件第一行解析：
    <type>(<scope>): <subject>
规则（与 AGENTS.md 同步维护）：
    - type 白名单：post / feat / fix / docs / style / refactor / chore / ci / test / perf
    - scope 必须是模块名（posts/theme/layout/lib/components/styles/markdown/seo/rss/tags/search/ci/docs/skills/release）——
      新增模块/新增 scope 时同步更新 SCOPE_WHITELIST 与 AGENTS.md
    - subject 必须包含中文（AGENTS.md：subject 中文；允许中英混写如 "smoke 测试动态断言"）
    - merge / revert 系统提交跳过
不适用（rondo 有、博客没有的规则，已去掉）：TODO 阶段校验 / PRD / FR 引用 / 分支名交叉校验 / 专用分支——
博客单 main 无 develop/feature 分支体系，见 AGENTS.md 提交规范节。
"""

import re
import sys
from pathlib import Path

TYPE_WHITELIST = (
    "post", "feat", "fix", "docs", "style", "refactor", "chore", "ci", "test", "perf",
)
# scope 模块名白名单（与 AGENTS.md 仓库结构与职责表同步维护）
SCOPE_WHITELIST = (
    "posts", "theme", "layout", "lib", "components", "styles", "markdown",
    "seo", "rss", "tags", "columns", "search", "ci", "docs", "skills", "release",
)
# 系统提交前缀（跳过校验）
SKIP_PREFIXES = ("merge:", "Merge", "revert:", "Revert")
# subject 必须含中文字符（允许中英混写）
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def main() -> int:
    if len(sys.argv) < 2:
        print("[错误] 用法: check_commit_msg.py <commit-msg-file>", file=sys.stderr)
        return 1

    msg_file = Path(sys.argv[1])
    if not msg_file.is_file():
        return 0

    # utf-8-sig：自动剥离 BOM（Windows 编辑器/脚本可能写带 BOM 的 UTF-8，会破坏首行正则，同 md 文件 BOM 坑）
    first = msg_file.read_text(encoding="utf-8-sig", errors="replace").splitlines()[0].strip()

    # merge / revert 系统提交跳过
    if first.startswith(SKIP_PREFIXES):
        return 0

    # 1. 基本格式 <type>(<scope>): <subject>
    m = re.match(r"^(post|feat|fix|docs|style|refactor|chore|ci|test|perf)\(([^)]*)\):\s*(.+)$", first)
    if not m:
        print("[拒绝] 提交消息必须符合 <type>(<scope>): <subject> 格式", file=sys.stderr)
        print(f"       type 白名单: {' / '.join(TYPE_WHITELIST)}", file=sys.stderr)
        print(f"       scope 白名单: {' / '.join(SCOPE_WHITELIST)}", file=sys.stderr)
        print("       示例: post(posts): 新增 git 提交规范文章", file=sys.stderr)
        print("       示例: feat(theme): 加宽文章正文容器", file=sys.stderr)
        return 1

    typ, scope, subject = m.group(1), m.group(2), m.group(3)

    # 2. scope 必须在模块名白名单内
    if scope not in SCOPE_WHITELIST:
        print(f"[拒绝] scope 必须是已登记的模块名（当前: {scope or '(空)'}）", file=sys.stderr)
        print(f"       可用 scope: {' / '.join(SCOPE_WHITELIST)}", file=sys.stderr)
        print("       新增模块 → 同步更新本脚本 SCOPE_WHITELIST 与 AGENTS.md 职责表", file=sys.stderr)
        return 1

    # 3. subject 必须包含中文（AGENTS.md：subject 中文）
    if not CJK_RE.search(subject):
        print("[拒绝] subject 必须包含中文（AGENTS.md 提交规范：subject 中文）", file=sys.stderr)
        print(f"       当前 subject: {subject}", file=sys.stderr)
        print("       示例: chore(ci): smoke 测试动态断言", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
