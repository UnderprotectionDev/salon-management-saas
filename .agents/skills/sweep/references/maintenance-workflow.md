# Sweep Maintenance Workflow Reference

Periodic scan procedures, diff detection, Grove handoff reception, and trend tracking.

---

## Incremental Scan (Per-PR / Sprint)

Git diff-based scan targeting only changed or affected files.

### Procedure

```bash
# 1. Get changed files since last baseline
git diff --name-only HEAD~10 -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.py' '*.go' '*.rs'

# 2. For each changed file, check if it's still imported
# TS/JS: use knip on affected workspace
npx knip --reporter compact --include files,exports

# Python: check specific files
vulture <changed-files> --min-confidence 80

# Go: check specific packages
staticcheck -checks U1000 ./<changed-package>/...
```

### Stale Import Detection

```bash
# Find imports of deleted/renamed files
git diff --name-only --diff-filter=D HEAD~10  # deleted files
# For each deleted file, grep for its import path in remaining code
```

### Output

- New orphan candidates (files no longer imported after changes)
- Stale imports (imports pointing to moved/deleted files)
- Score each candidate through Confidence Score pipeline

---

## Full Periodic Scan (Sprint-end / Quarterly)

Comprehensive scan combining tool output with git history analysis.

### Procedure

```bash
# 1. Run primary detection tool
# TS/JS
npx knip --reporter json > /tmp/knip-report.json

# Python
vulture src/ --min-confidence 60 > /tmp/vulture-report.txt
autoflake --check --remove-all-unused-imports -r src/ > /tmp/autoflake-report.txt

# Go
staticcheck -checks U1000 ./... 2> /tmp/staticcheck-report.txt
deadcode -test ./... > /tmp/deadcode-report.txt

# 2. Cross-reference with git activity
git log --since="6 months ago" --name-only --pretty=format: | sort -u > /tmp/active-files.txt
comm -23 <(git ls-files | sort) <(sort /tmp/active-files.txt) > /tmp/stale-files.txt

# 3. Identify files with zero references AND stale git history
# These are highest-confidence deletion candidates

# 4. Score all candidates through Confidence Score
# ≥90: auto-propose for batch deletion
# 70-89: queue for individual review
# 50-69: flag for manual review
# <50: skip
```

### Dependency Audit (Quarterly)

```bash
# TS/JS: knip covers deps
npx knip --include dependencies

# Python
pip-audit 2>/dev/null
pipdeptree --warn silence | grep -E "^\w"  # top-level only

# Go
go mod tidy -v 2>&1 | grep -E "(unused|removed)"
```

---

## Grove Handoff Reception

### Processing GROVE_TO_SWEEP_HANDOFF

When Grove sends a handoff (see `grove/references/audit-commands.md` for template):

```
1. RECEIVE: Parse GROVE_TO_SWEEP_HANDOFF YAML
2. VALIDATE: For each candidate:
   a. Verify file still exists
   b. Run through Primary Detection Tool (knip/vulture/staticcheck)
   c. Check git log for recent activity
   d. Calculate Confidence Score
3. CATEGORIZE:
   - ≥70 confidence: Accept as cleanup candidate
   - 50-69: Flag for manual verification
   - <50: Return to Grove with "structural but still referenced" note
4. MERGE: Add validated candidates to current scan baseline
5. REPORT: Include Grove-sourced items in next cleanup report
   - Tag with "source: grove-handoff" for traceability
```

### Feedback to Grove

After processing handoff, send structural feedback:

```yaml
SWEEP_TO_GROVE_FEEDBACK:
  handoff_date: "YYYY-MM-DD"
  processed: 5
  accepted: 3    # added to cleanup queue
  deferred: 1    # needs manual review
  rejected: 1    # still has active references
  notes:
    - "config/old-webpack.config.js confirmed unused (confidence: 92)"
    - "src/utils/deprecated-helper.ts has 1 dynamic import — deferred"
```

---

## Baseline Management

### SCAN_BASELINE Format

Record in `.agents/sweep.md`:

```yaml
SCAN_BASELINE:
  date: "YYYY-MM-DD"
  scan_type: "full"  # or "incremental"
  tool: "knip"
  total_files_scanned: 342
  candidates_found: 15
  candidates_by_confidence:
    batch_delete: 3     # ≥90
    individual_review: 5 # 70-89
    manual_review: 4    # 50-69
    skipped: 3          # <50
  deleted_this_cycle: 8
  space_reclaimed_kb: 45
  false_positives: 2
  categories:
    dead_code: 6
    orphan_assets: 3
    unused_deps: 2
    config_remnants: 2
    duplicates: 1
    build_artifacts: 1
```

### Baseline Update Rules

- **After each cleanup**: Record what was deleted, FP count, space reclaimed
- **Incremental scan**: Merge new candidates into existing baseline
- **Full scan**: Replace entire baseline with fresh data
- **Grove handoff**: Append candidates with `source: grove-handoff` tag

---

## Trend Tracking

### Sprint-over-Sprint Template

```
Sweep Trend Report
==================
Sprint 12 (2025-02-01 ~ 2025-02-14)
  Scanned: 342 files
  Found: 15 candidates
  Deleted: 8
  FP: 2
  Space: -45 KB

Sprint 11 (2025-01-18 ~ 2025-01-31)
  Scanned: 338 files
  Found: 12 candidates
  Deleted: 10
  FP: 1
  Space: -62 KB

Trend:
  Candidate rate: 4.4% → 3.5% (improving)
  FP rate: 8.3% → 13.3% (watch)
  Cleanup velocity: 10 → 8 files/sprint
```

### Health Indicators

| Metric | Good | Watch | Alert |
|--------|------|-------|-------|
| Candidate rate | <3% | 3-5% | >5% |
| FP rate | <10% | 10-20% | >20% |
| Stale file growth | Decreasing | Flat | Increasing |
| Cleanup velocity | Increasing | Flat | Decreasing |

When Alert triggers, escalate to Grove for structural audit (potential anti-pattern emergence).
