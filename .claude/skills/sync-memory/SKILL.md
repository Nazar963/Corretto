---
name: sync-memory
description: Update the Obsidian vault (docs/) so it matches the verified current state of the code
disable-model-invocation: true
---

Synchronize the project memory in `docs/` with the current verified state of the project.
Focus (optional): $ARGUMENTS

1. Run `git status` and `git diff` (and recent commits if useful) to see what changed.
2. Read `docs/00-index.md` and open only the notes affected by these changes.
3. Compare each affected note with the real code, migrations, API definitions and tests.
   Report any contradiction instead of silently choosing a side.
4. Update only descriptive notes: `docs/features/`, `docs/architecture/`, `docs/operations/`.
5. Update `docs/status/current.md`:
   - move items between Completed / In progress / Blocked;
   - for every Completed item add evidence (commit or PR, test file, command run);
   - set "Last reviewed" only for things you actually checked.
6. If a new architectural decision was made, create a new ADR in `docs/adr/` from `_template.md`
   with `status: proposed`. Never set `accepted`, never rewrite an accepted ADR.
   If a requirement should change, describe the proposal in the report; do not edit it.
7. Make sure every new note is linked from `docs/00-index.md` with a relative Markdown link,
   and that no link is broken.
8. Do not put secrets in the vault. Do not commit.

Final report:
- Notes created / modified (paths)
- Contradictions found between notes and code
- Proposals awaiting my approval (ADRs, requirement changes)
- Things you could not verify
