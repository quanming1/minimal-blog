---
title: Our Git Commit Convention & Workflow
date: '2026-08-13'
description: From Conventional Commits to locally-enforced hooks — how we designed a commit system that is traceable, machine-readable, and mistake-proof.
tags: [Git, Commit Convention, Engineering]
---

Commit messages are the finest-grained execution log of a project. When you look back through history, messages like `fix stuff`, `update`, or `misc` tell you nothing — what changed, which phase it belonged to, why it was done: all lost.

This post introduces the commit convention we've put into practice: Conventional Commits as the base, extended with **phase association, PRD synchronization, branch cross-checks, and locally-enforced hooks** — so every commit is traceable, machine-consumable, and mistakes are caught at the moment they happen.

## Why a convention at all

- **Traceability**: every commit maps to a concrete step in the development backlog — later you know exactly which phase it was written for
- **Machine-readability**: the structured `<type>(<scope>)` format can be consumed by tooling — CHANGELOG generation, review filtering, release management
- **Mistake-proofing**: a wrong phase id or a misspelled type is rejected by the local hook on the spot, instead of polluting history

> [!TIP]
> A convention isn't a ceremony for others — it's primarily a search index for **your future self**. Three months later, `git log --grep=feat` precisely surfaces every feature change. That value alone is worth the effort.

## Format: `<type>(<scope>): <subject>`

```text
feat(A2): add variable substitution
```

- `type`: commit type, 10-item whitelist (below)
- `scope`: scope, three rule sets by type
- `subject`: one-line description

Add context as a body paragraph when needed (write the "why", not just the "what"):

```bash
git commit -m "feat(C2): add loop orchestrator" \
           -m "input_state/output_state passing, aligned with comanda's orchestrator design"
```

## Type whitelist (10)

| type | meaning | example |
|---|---|---|
| `feat` | new feature / behavior change (must sync PRD changelog) | `feat(A2): add variable substitution` |
| `fix` | bug fix (name the phase it fixes) | `fix(C1): checkpoint persistence` |
| `docs` | documentation | `docs(roadmap): clarify C1 acceptance` |
| `refactor` | refactor (no behavior change) | `refactor(processor): extract variable substitution` |
| `test` | tests | `test(models): add provider routing test` |
| `style` | formatting / style (no behavior change) | `style(cli): unify argument order` |
| `chore` | build / tooling / misc | `chore(tests): bump CI dependency` |
| `perf` | refinement (see scope rules for semantics) | `perf(C2-FR6): improve flow log format` |
| `prd` | PRD document (dedicated branch) | `prd(C2): add multi-loop orchestration PRD` |
| `todos` | TODO backlog / planning doc (dedicated branch) | `todos(G1): update test progress` |

## Three scope rule sets

`scope` is not arbitrary — it follows three rule sets by type:

**1. Feature / planning types → TODO phase id**

`feat` / `fix` / `prd` / `todos` scopes must be a phase id from the backlog (e.g. `A1`, `C2`), and the id **must actually exist** — the hook parses the backlog in real time; a wrong id is rejected with the list of available phases.

```bash
git commit -m "feat(A2): add variable substitution"  # valid
git commit -m "feat(ZZ9): new feature"               # rejected: ZZ9 does not exist
```

**2. Refinement → phase id + FR reference**

`perf` means "refine an already-described capability" (repository-local semantics, deliberately deviating from the standard perf=performance). The scope must carry an FR reference, and the **referenced FR number must actually exist in the corresponding PRD**:

```bash
git commit -m "perf(C2-FR6): improve flow log format"    # single FR
git commit -m "perf(C2-FR6,FR8): optimize condition parsing"  # multiple FRs
```

**3. Other types → module name**

`docs` / `refactor` / `test` / `style` / `chore` use module scopes, not bound to a phase:

```
cli / config / models / processor / agentic / loop / skills / memory / server / tui / index / docs / tests
```

```bash
git commit -m "refactor(processor): extract variable substitution into utils"
```

## Three special constraints

**feat must sync the PRD**: the staged files of a feature commit must include the corresponding phase PRD — the behavior change is appended to the PRD's changelog section. This binds "changing code" and "changing docs" together, preventing the docs from lagging behind the code.

**prd / todos run on dedicated branches**: planning commits must happen on `prd-update` / `todos-update` branches, and the staged files may only be `docs/` documents — planning is physically isolated from code, so "editing code while writing a PRD" is impossible.

**Branch cross-check**: `feat` / `fix` / `perf` branch names must carry a phase id, and the commit scope must **match** the branch:

```bash
git checkout -b feature/A2-config develop
git commit -m "feat(A2): add variable substitution"  # valid: branch A2 == scope A2
git commit -m "feat(C1): add loop engine"            # rejected: branch A2 != scope C1
```

This catches "working on the wrong tree" at commit time — if you were about to write C1 code on an A2 branch, it surfaces immediately.

## Locally enforced: hooks, not willpower

Every rule is enforced by local git hooks. Non-conforming commits are rejected outright — **no human discipline required**:

- **commit-msg hook**: validates type whitelist, phase existence, feat-with-PRD, perf-with-real-FR, prd/todos dedicated branch & docs-only files, branch cross-check
- **pre-push hook**: `develop` forbids direct commits (new commits pushed must all be merge commits); `main` is never committed to directly

> [!IMPORTANT]
> The key to a convention surviving long-term is not how well it's documented — it's **letting machines do the checking**. Human review gets tired, misses things, and makes "just this once" exceptions. Hooks don't.

## Git Flow workflow

Branch model:

```text
main            ← releases only
  └─ develop    ← integration (merge-only)
       ├─ feature/<phaseid>-<task>   new features
       ├─ release/<ver>              release prep
       └─ hotfix/<name>              urgent fixes
```

The full loop for every task:

```bash
# 1. sync base
git checkout develop && git pull
# 2. create task branch (name carries the phase id)
git checkout -b feature/C2-flow develop
# ... develop + run tests locally (pytest / ruff) ...
# 3. commit (conventional; hook validates automatically)
git add <changed files>
git commit -m "feat(C2): add flow orchestrator"
# 4. merge back to develop (keep the merge commit)
git checkout develop && git merge --no-ff feature/C2-flow
# 5. push (pre-push validates develop is all merges)
git push origin develop
```

`--no-ff` keeps merge commits so history clearly shows "which batch of commits made up a feature"; `develop` is merge-only, so direct commits can never bypass the review semantics.

## Common mistakes

| wrong | problem | right |
|---|---|---|
| `feat: new feature` | missing scope | `feat(A2): new feature` |
| `feat(config): new feature` | feat used a module scope | `feat(A1): new feature` |
| `prd(C2): write PRD` (on develop) | prd must be on prd-update | `git checkout -b prd-update develop` |
| `todos(G1): update` (staged includes code) | todos may only touch docs/ | stage docs/ files only |
| `feat(AA9): fix` | phase id doesn't exist | use a real id from the backlog |
| `feat(C2): new feature` (no PRD staged) | feat must sync the PRD changelog | update the PRD first |
| `perf(C2): refine` | perf must carry an FR reference | `perf(C2-FR6): refine` |
| `update xxx` | no type/scope, meaningless | `chore(tests): bump dependency` |
| multiple things in one commit | untraceable | split into separate commits |

## Wrap-up

For a commit convention to actually survive, three things must be in place: **a simple format** (one line of type/scope/subject), **machine-verifiable rules** (hooks, not willpower), and **integration with the dev workflow** (phase ids tied to the backlog, feat bound to PRDs, branch cross-checks).

We run this system on our rondo project (a YAML-driven LLM workflow orchestration tool) and it works — hundreds of commits, every one traceable to a concrete phase, CHANGELOG auto-generatable, zero meaningless commits in history.

> [!WARNING]
> A convention is a means, not an end. If a rule makes you constantly detour or you forget why it exists, it deserves re-examination — good rules should act like guardrails, not mazes.
