---
title: 'The Rondo Method: PRD-Driven Development with Hard Agent Constraints'
date: '2026-08-13'
description: A practical recipe for AI pair development distilled from the rondo project — PRD-driven development, hard AGENTS.md constraints, and TODO-list governance that keep humans and AI agents working under the same rules.
tags: [Engineering, AI Agent, Dev Process]
---

The biggest problem with AI pair development isn't "the AI isn't capable" — it's that **every session starts as a fresh hire**. No project memory, no knowledge of your conventions, prone to doing the right-looking thing in the wrong place. The rondo project (a YAML-driven LLM workflow orchestration tool, developed with claude-code deeply involved) solved this with a constraint system written into the repository.

I practiced it end to end, hit the pitfalls, and patched them. This post distills it into a copyable methodology called **the Rondo Method**: three pillars + one closed loop + Git Flow.

## Why you need a system

> [!WARNING]
> If every new task requires verbally reminding the agent to "read the docs first, don't touch unrelated files, write proper commits" — your project lacks **machine-readable constraints**.

An AI agent has no persistent memory; its only stable input is **the files already in the repository**. So constraints must be written into the repo, readable by the agent, and enforceable by machines. Those three properties are where the Rondo Method starts.

## Pillar 1: PRD-driven development

**PRD first, code second** — no stage starts until its PRD is finalized (`approved`):

- **The PRD is the single source of truth**: requirements, implementation, tests, and acceptance all reference it; building anything not defined in it is forbidden
- **One stage, one PRD**: each TODO stage maps to `docs/prd/PRD-<stage>-<name>.md`, copied from the template
- **Changes go through the log**: after `approved`, any requirement change must append a "change log" entry (date + change + reason) and re-run the acceptance checklist
- **No acceptance, no completion**: every item in the PRD's acceptance criteria must pass before updating TODO / CHANGELOG or moving to the next stage

> [!TIP]
> The value of a PRD template is that **structure is discipline** — it forces you to write "non-goals" (to stop scope creep) and executable acceptance criteria (to stop "looks good enough"). Full template in the assets below.

## Pillar 2: Hard AGENTS.md constraints

`AGENTS.md` is the behavioral contract for **all AI agents** (claude-code, other collaborators) and humans in the repo — read and obey it fully before touching anything. It turns the most failure-prone things into hard rules:

```text
# Work style
- Strictly follow the stage order in docs/TODO.yaml — no skipping, no overreach
- Read the relevant docs and existing code before starting; follow existing patterns; don't invent parallel ones
- No undeclared dependencies; only touch files in the task scope

# Language & style
- Comments, docstrings, commit messages, docs in Chinese; identifiers in English
- Comments explain "why", not "what"; no emoji

# Git enforcement
- Never commit directly to main; develop accepts merges only
- feat/fix scope must cross-check against the stage id in the branch name
- Rules are enforced by .githooks/ — not by willpower
```

Key design: **rules must be machine-checkable**. The commit-msg hook parses `TODO.yaml` live to validate stage ids — a typo is rejected on the spot with a list of valid stages. Human review gets tired and makes exceptions; hooks don't.

## Pillar 3: TODO-list governance

`docs/TODO.yaml` is the **single execution authority** — a structured task list expanded from the roadmap by stage:

```yaml
stages:
  - id: A
    name: Foundation
    steps:
      - id: A1
        title: CLI skeleton + config system + multi-provider abstraction
        status: done
        prd: docs/prd/PRD-A1-cli-config.md
        acceptance: all passed — pytest 20 passed, ruff clean
```

- Each step carries **modules / acceptance / status** (done / in_progress / todo)
- **Status linkage**: mark `in_progress` at kickoff, flip to `done` only after acceptance; the PRD lifecycle (draft → approved → developing → accepted) moves in lockstep
- **Consumed by machines**: the commit hook reads it to validate stage ids — the TODO is data for tooling, not a checklist for humans

## The six-step closed loop

```
Kickoff → Review → Develop → Verify → Wrap up → Release (optional)
```

| Step | Action | Artifact / status |
|---|---|---|
| 1. Kickoff | Pick a stage from TODO, write the PRD | `PRD-<stage>-<name>.md` (draft) |
| 2. Review | Walk requirements & acceptance criteria line by line | PRD `approved` (frozen) |
| 3. Develop | Implement per PRD; `feature/<stage>-<task>` branch | Code + tests |
| 4. Verify | Run every acceptance item (pytest / ruff / manual) | All pass → wrap up; fail → back to develop |
| 5. Wrap up | Update CHANGELOG, TODO status, PRD `accepted` | Merge to develop, push |
| 6. Release | Release branch + version freeze + regression + tag | `release/<ver>` → main |

## Git Flow pairing

- **Branch model**: `main` (releases only) → `develop` (daily integration, merges only) → `feature/<stage>-<task>` / `release/<ver>` / `hotfix/<name>`
- **Commit format**: `<type>(<scope>): <subject>`; feat/fix scope must be a real stage id in TODO; feat additionally requires the staged files to include the stage PRD (behavior changes stay in sync with docs)
- **Machine enforcement**: `.githooks/commit-msg` validates the type whitelist / stage existence / feat-carries-PRD / perf-FR reference / branch cross-check; `.githooks/pre-push` protects main and develop
- **AI and humans share the same rules**: no "special case for agents" — that's exactly why the constraints survive long-term

## The key files

The core files are extracted as downloadable assets:

> [!asset] rondo-method/AGENTS.md
> The full agent behavioral contract — work style / code style / Git Flow / testing / docs / PRD-driven / security boundaries. The entry point of the whole system.

> [!asset] rondo-method/PRD-TEMPLATE.md
> The PRD template — structure is discipline: forces non-goals and executable acceptance criteria.

> [!asset] rondo-method/PRD-A1-cli-config.md
> A real, accepted PRD (rondo stage A1) — what a finalized PRD looks like, with checked FR/AC and a change log.

> [!asset] rondo-method/TODO.yaml
> A structured task list example — staged, with modules and acceptance per step, machine-consumable by hooks.

> [!TIP]
> The full asset pack (6 files, including `PROCESS.md` and a `README.md` explaining usage and minimal combos) lives in the asset directory.

## Scaling it down

The Rondo Method is battle-tested in rondo, and scales to fit:

- **Minimal**: `AGENTS.md` + `PROCESS.md` + `PRD-TEMPLATE.md` — governs how agents work
- **Medium**: add `TODO.yaml` — staged progress with status linkage
- **Full**: add Git Flow + hooks — even commits are machine-validated

The ==core principle is one line==: **constraints live in the repo, are readable and enforceable, and AI obeys the same rules as humans**. The details — whether to have a develop branch, whether scopes are stage ids or module names — are yours to cut. Rules are guardrails, not mazes.

> [!IMPORTANT]
> This method has run a complete loop in rondo: from the A1 foundation to C2 multi-loop orchestration, hundreds of commits all traceable to concrete stages, PRDs always in sync with code, not a single "meaningless commit". It doesn't solve "can the AI write code" — it solves "how the AI's output stays under control".
