# Sweep Language-Specific Patterns Reference

Detection strategies and tools by programming language.

---

## TypeScript / JavaScript

### knip-first Strategy

**knip is the primary tool for TS/JS projects.** It replaces ts-prune, depcheck, and unimported with a single unified analysis covering files, exports, dependencies, and types.

```bash
# Primary: comprehensive analysis (always run first)
npx knip --reporter compact

# Detailed JSON output for automation
npx knip --reporter json

# Check specific areas
npx knip --include files          # unused files only
npx knip --include exports        # unused exports only
npx knip --include dependencies   # unused deps only
```

### Fallback Tools

Use only when knip is unavailable (no knip config, older project, knip errors):

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `ts-prune` | Unused exports | knip unavailable, exports-only check |
| `depcheck` | Unused dependencies | knip unavailable, deps-only check |
| `unimported` | Unimported files | knip unavailable, files-only check |

```bash
# Fallback: unused exports
npx ts-prune --error

# Fallback: unused dependencies
npx depcheck --ignores="@types/*,eslint-*"
```

### Common False Positives
- Dynamic imports with template literals
- Re-exports in barrel files (`index.ts`)
- Type-only exports (use `--skip-type-only` in ts-prune)
- Framework convention files (pages, routes)

---

## Python

### Recommended Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| `vulture` | Dead code | `vulture src/ --min-confidence 80` |
| `autoflake` | Unused imports | `autoflake --check .` |
| `pip-autoremove` | Unused packages | `pip-autoremove --list` |

### Common False Positives
- `__init__.py` files (module markers)
- Dunder methods (`__str__`, `__repr__`)
- Flask/Django routes with decorators
- Celery tasks

### Detection Commands
```bash
# Find dead code with whitelist
vulture src/ whitelist.py --min-confidence 80

# Check unused imports
autoflake --check --remove-all-unused-imports -r .
```

---

## Go

### Recommended Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| `staticcheck` | Comprehensive linter | `staticcheck ./...` |
| `deadcode` | Dead code detection | `deadcode ./...` |
| `go mod tidy` | Unused deps | `go mod tidy -v` |

### Common False Positives
- Interface implementations
- Exported but unused (public API)
- `init()` functions
- CGO-related code

### Detection Commands
```bash
# Find unused code
staticcheck -checks U1000 ./...

# Find dead code
deadcode -test ./...

# Clean up dependencies
go mod tidy -v 2>&1 | grep -E "(unused|removed)"
```

---

## Rust

### Recommended Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| `cargo udeps` | Unused dependencies | `cargo +nightly udeps` |
| `cargo clippy` | Dead code warnings | `cargo clippy -- -W dead_code` |

### Detection Commands
```bash
# Unused dependencies
cargo +nightly udeps

# Dead code warnings
cargo clippy -- -W dead_code

# Check workspace-wide
cargo +nightly udeps --workspace
```

---

## Language-Agnostic Patterns

**Files commonly misdetected across languages:**
- Entry points (`main.*`, `index.*`, `app.*`)
- Config files (`*.config.*`, `.*rc`)
- Test fixtures and mocks
- Generated code (`*.generated.*`, `*.g.*`)
- Documentation (`*.md`, `docs/*`)
