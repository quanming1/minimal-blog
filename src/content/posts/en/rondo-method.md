---
title: 'The Rondo Method: PRD-Driven Development with Hard Agent Constraints'
date: '2026-08-13'
description: A practical recipe for AI pair development distilled from the rondo project — PRD-driven development, hard AGENTS.md constraints, TODO-list governance, a six-step loop, and a PRD change decision machine.
column: Rondo Method
tags: [Engineering, AI Agent, Dev Process]
---

The biggest problem with AI pair development isn't "the AI isn't capable" — it's that **every session starts as a fresh hire**. No project memory, no knowledge of your conventions, prone to doing the right-looking thing in the wrong place. The rondo project solved this with a constraint system written into the repository.

I practiced it end to end, and distilled it into the **Rondo Method**: three pillars + one process loop + a change discipline. This post presents it semi-structurally — tables, pseudocode, and hard MUSTs — so you can follow it directly.

## 1. Why you need a system

> [!WARNING]
> If every new task requires verbally reminding the agent to "read the docs first, don't touch unrelated files, write proper commits" — your project lacks **machine-readable constraints**.

An AI agent has no persistent memory; its only stable input is **the files already in the repository**. So constraints must satisfy three properties:

| Property | Meaning | Mechanism |
|---|---|---|
| Written into the repo | readable by the agent | AGENTS.md / docs/ |
| Readable | fixed paths, clear conventions | TODO.yaml / PROCESS.md / PRD |
| Enforceable | machine-checked, not willpower | git hooks / CI |

## 2. The three pillars

### Pillar 1: PRD-driven development

**PRD first, code second** — no stage starts until its PRD is finalized (`approved`):

- The PRD is the **single source of truth**: requirements, implementation, tests, and acceptance all reference it; building anything not defined in it is forbidden
- **One stage, one PRD**: `docs/prd/PRD-<stage>-<name>.md`, copied from the template
- **No acceptance, no completion**: every item in the acceptance criteria must pass before updating TODO / CHANGELOG

> [!TIP]
> The value of a PRD template is that **structure is discipline** — it forces non-goals (to stop scope creep) and executable acceptance criteria (to stop "looks good enough").

### Pillar 2: Hard AGENTS.md constraints

`AGENTS.md` is the behavioral contract for **all AI agents** and humans in the repo — read and obey it fully before touching anything:

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

### Pillar 3: TODO-list governance

`docs/TODO.yaml` is the **single execution authority** — a structured task list expanded from the roadmap by stage:

```yaml
stages:
  - id: A
    name: Foundation
    steps:
      - id: A1
        title: CLI skeleton + config system
        status: done
        prd: docs/prd/PRD-A1-cli-config.md
        acceptance: all passed — pytest 20 passed, ruff clean
```

- Each step carries **modules / acceptance / status** (done / in_progress / todo)
- **Status linkage**: mark `in_progress` at kickoff, flip to `done` only after acceptance; the PRD lifecycle moves in lockstep
- **Consumed by machines**: the commit hook reads it to validate stage ids — the TODO is data for tooling, not a checklist for humans

## 3. The full development process (six-step loop)

> This section is the execution skeleton: from requirement to release, every step has a clear action, artifact, and state. **No stage starts without a finalized PRD.**

### 3.1 The six-step closed loop

```
Kickoff → Review → Develop → Verify → Wrap up → Release
```

| Step | Action | Artifact / status |
|---|---|---|
| 1. Kickoff | Pick a stage from TODO, write the PRD | `PRD-<stage>-<name>.md` (draft) |
| 2. Review | Walk requirements & acceptance criteria line by line | PRD `approved` (frozen) |
| 3. Develop | Implement per PRD; `feature/<stage>-<task>` branch | Code + tests |
| 4. Verify | Run every acceptance item (lint / test / build / manual) | All pass → wrap up; fail → back to develop |
| 5. Wrap up | Update CHANGELOG, TODO status, PRD `accepted` | Merge to develop, push |
| 6. Release | Release branch + version freeze + regression + tag | `release/<ver>` → main + tag |

### 3.2 PRD lifecycle state machine

Every state transition has an explicit trigger; **requirement changes can interrupt the main loop at any time** — the state machine routes them:

```text
// ── PRD lifecycle state machine (with requirement-change routing) ──
// States: draft → review → approved → developing → accepted

STATE = draft

// Main loop (six steps)
kickoff:  pick a stage from TODO → copy template → write PRD → STATE = draft
review:   walk requirements & AC line by line
          → all sound ? STATE = approved (frozen) : back to draft
develop:  implement per PRD (PRD is the only authority, no overreach) → STATE = developing
verify:   run every AC item (lint / test / build / manual)
          → all pass ? STATE = accepted : back to developing (fix and re-verify)
wrap-up:  sync states (PRD accepted + TODO done + CHANGELOG appended)

// ── Requirement-change routing (on new requirements, any state) ──
on new requirement:

    // Decision: open a new PRD or amend the existing one?
    if requirement is within the existing PRD's scope (same stage / same topic / refinement
       of existing FR·AC) and the PRD has not diverged into a different direction:
        → route to [Path B] amend the existing PRD
    else (new stage / brand-new topic / crosses the PRD boundary):
        → route to [Path A] open a new PRD

// Path A: open a new PRD
pathA:
    pick/create a stage in TODO.yaml (mark in_progress)
    copy PRD-TEMPLATE.md → docs/prd/PRD-<stage>-<name>.md
    restart the main loop at [kickoff]

// Path B: amend the existing PRD
pathB:
    update the PRD body (corresponding FR / AC / technical approach)
    MUST append a row to the trailing "Change log" section: date + change + reason
    // The change log is mandatory — it is the audit trail of requirement changes
    MUST re-check the affected AC:
        if STATE == approved:   update AC, stay approved
        elif STATE == developing: re-run affected AC → proceed only if passing
        elif STATE == accepted:  re-run affected AC → if failing, STATE = developing
```

### 3.3 Requirement changes: two paths

Requirement changes are normal — the point is to **decide first, then act**. The criteria:

| Dimension | Path A: new PRD | Path B: amend existing PRD |
|---|---|---|
| Stage | new TODO stage / cross-stage | within the same stage |
| Topic | brand-new direction | same topic, incremental/refinement |
| Scope | crosses the PRD boundary | refinement of existing FR/AC |
| PRD state | accepted and the new ask is a different thing | any state (including small post-acceptance tweaks) |
| Action | copy template, new doc, full loop | edit body + **MUST log the change at the end** |

> [!IMPORTANT]
> **Path B discipline**: when amending a PRD, MUST append a row to the trailing "Change log" section (date + change + reason) and re-check the affected acceptance criteria. This is the **audit trail** of requirement changes — without it, the PRD drifts silently, code and docs diverge again, and the whole system fails.

## 4. Git Flow pairing

- **Branch model**: `main` (releases only) → `develop` (daily integration, merges only) → `feature/<stage>-<task>` / `release/<ver>` / `hotfix/<name>`
- **Commit format**: `<type>(<scope>): <subject>`; feat/fix scope must be a real stage id in TODO; feat additionally requires the staged files to include the stage PRD
- **Machine enforcement**: `.githooks/commit-msg` validates the type whitelist / stage existence / feat-carries-PRD / branch cross-check; `.githooks/pre-push` protects main and develop
- **AI and humans share the same rules**: no "special case for agents"

## 5. The key files

The core files are extracted as downloadable assets:

> [!asset] rondo-method/AGENTS.md
> The full agent behavioral contract — work style / code style / Git Flow / testing / docs / PRD-driven / security boundaries. The entry point of the whole system.

> [!asset] rondo-method/PRD-TEMPLATE.md
> The PRD template — structure is discipline: forces non-goals and executable acceptance criteria; the trailing "Change log" section is where Path B lands.

> [!asset] rondo-method/PRD-A1-cli-config.md
> A real, accepted PRD (rondo stage A1) — what a finalized PRD looks like, with checked FR/AC and a change log.

> [!asset] rondo-method/TODO.yaml
> A structured task list example — staged, with modules and acceptance per step, machine-consumable by hooks.

> [!TIP]
> The full asset pack (6 files, including `PROCESS.md` and a `README.md` explaining usage and minimal combos) lives in the asset directory.

## 6. Scaling it down

The Rondo Method is battle-tested in rondo, and scales to fit:

| Size | Combo | Coverage |
|---|---|---|
| Minimal | `AGENTS.md` + `PROCESS.md` + `PRD-TEMPLATE.md` | governs how agents work |
| Medium | add `TODO.yaml` | staged progress with status linkage |
| Full | add Git Flow + hooks | even commits are machine-validated |

The ==core principle is one line==: **constraints live in the repo, are readable and enforceable, and AI obeys the same rules as humans**. The details — whether to have a develop branch, whether scopes are stage ids or module names — are yours to cut. Rules are guardrails, not mazes.

> [!IMPORTANT]
> This method has run a complete loop in rondo: from the foundation to multi-loop orchestration, hundreds of commits all traceable to concrete stages, PRDs always in sync with code, not a single "meaningless commit". It doesn't solve "can the AI write code" — it solves "how the AI's output stays under control".
