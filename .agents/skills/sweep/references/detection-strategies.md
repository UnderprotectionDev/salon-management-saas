# Sweep Detection Strategy Reference

Comprehensive detection matrix, quantitative thresholds, and confidence-gated flowchart.

---

## By File Type

| File Type | Detection Method | Risk Level | Tools |
|-----------|------------------|------------|-------|
| Source Code | Import analysis | High | knip, ts-prune, vulture, staticcheck |
| Assets | Reference search | Medium | grep, custom scripts |
| Config | Tool verification | Medium | Manual + scripts |
| Dependencies | Import scan | Low | knip, depcheck, npm-check |
| Build Output | .gitignore check | Low | git status |
| Duplicates | Hash comparison | Medium | fdupes, custom |

---

## By Risk Level

| Risk | Files | Approach |
|------|-------|----------|
| Critical | Core source, configs | Manual review required |
| High | Feature code, tests | Verify no references |
| Medium | Assets, utilities | Check all usages |
| Low | Cache, temp, backups | Safe to remove |

---

## Quantitative Thresholds

Use these thresholds as guidelines for prioritizing cleanup candidates.

### File Age Thresholds

| Age | Priority | Interpretation |
|-----|----------|----------------|
| < 7 days | Very Low | Recently created, likely still in use |
| 7-30 days | Low | Recently active, verify before deletion |
| 30-90 days | Medium | May be stale, investigate usage |
| 90-365 days | High | Likely unused, strong deletion candidate |
| > 365 days | Very High | Almost certainly unused |

### File Size Thresholds

| Size | Impact | Action |
|------|--------|--------|
| < 1 KB | Low | Safe to delete if unused |
| 1-10 KB | Low | Standard verification |
| 10-100 KB | Medium | Check for code reuse potential |
| 100 KB - 1 MB | High | Detailed review recommended |
| > 1 MB | Very High | Investigate before deletion |

### Reference Count Thresholds

| References | Status | Action |
|------------|--------|--------|
| 0 | Orphan | Strong deletion candidate |
| 1 (self only) | Dead code | Verify no external entry points |
| 1-2 | Low usage | Check if references are active |
| 3+ | Active | Likely needed, do not delete |

### Dependency Metrics

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| Unused exports | > 50% | File may need refactoring |
| Circular deps | Any | Investigate before cleanup |
| Transitive deps | > 10 | Core file, be cautious |

---

## Confidence-Gated Detection Flowchart

Confidence Score is calculated inline in SKILL.md. This flowchart integrates confidence gates into the detection process.

```
File Discovered
    │
    ├─ Is it in exclusion list? (.sweepignore, never-delete)
    │   └─ Yes → SKIP
    │
    ├─ Is it in .gitignore?
    │   ├─ Yes, but committed → Candidate (build artifact) → Score
    │   └─ No → Continue analysis
    │
    ├─ Is it imported/referenced?
    │   ├─ No references found → Candidate (orphan) → Score
    │   ├─ Only self-reference → Candidate (dead code) → Score
    │   └─ Has references → Keep, verify references are live
    │
    ├─ Is it a config file?
    │   ├─ Tool not in use → Candidate (config remnant) → Score
    │   └─ Tool active → Keep
    │
    ├─ Is it a duplicate?
    │   ├─ Identical content exists → Candidate (duplicate) → Score
    │   └─ Unique content → Keep
    │
    └─ CONFIDENCE GATE (applied to all candidates)
        ├─ ≥90 → Batch delete proposal
        ├─ 70-89 → Individual review proposal
        ├─ 50-69 → Manual review queue
        ├─ 30-49 → Keep (low confidence)
        └─ <30 → Never delete
```

---

## Git History Verification

Use git history to validate cleanup candidates and understand file context.

```bash
# Check file's last modification date and author
git log -1 --format="%ai %an" -- path/to/file

# View file's complete history
git log --oneline -- path/to/file

# Check if file was recently deleted and restored
git log --diff-filter=D --name-only -- path/to/file

# Find who added the file and why
git log --diff-filter=A --format="%h %s" -- path/to/file

# Check if file is referenced in any commit messages
git log --all --grep="filename"

# List files not modified in the last N months
git log --since="6 months ago" --name-only --pretty=format: | sort -u > active_files.txt
comm -23 <(git ls-files | sort) <(sort active_files.txt) > stale_files.txt
```

### Git-based Decision Criteria

| Criterion | Safe to Delete | Caution Required |
|-----------|----------------|------------------|
| Last modified | > 6 months ago | < 1 month ago |
| Commit frequency | 1-2 commits total | Many commits |
| Last author | Bot / CI | Core contributor |
| Commit message | "temp", "wip", "test" | Feature description |
| Delete/restore history | Never restored | Was restored before |
