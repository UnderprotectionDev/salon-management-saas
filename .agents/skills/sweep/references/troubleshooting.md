# Sweep Troubleshooting Reference

Common issues and solutions during cleanup operations.

---

## ts-prune False Positives

**Problem:** ts-prune reports exports as unused when they are re-exported.

**Solution:**
```bash
# Use with ignore patterns
npx ts-prune --ignore "index.ts"

# Or use knip which handles barrel files better
npx knip
```

---

## depcheck @types Issues

**Problem:** depcheck reports @types/* packages as unused even when needed.

**Solution:**
```bash
# Ignore type packages
npx depcheck --ignores="@types/*"

# Or check TypeScript config for types usage
grep -r "types" tsconfig.json
```

---

## Build Breaks After Cleanup

**Problem:** Build fails after removing files detected as unused.

**Recovery Steps:**
1. Restore from backup branch: `git checkout backup/pre-cleanup-YYYY-MM-DD`
2. Identify breaking file: Check build error message
3. Investigate why detection failed (dynamic import, framework convention, etc.)
4. Add to `.sweepignore` for future scans
5. Re-attempt cleanup excluding the problematic file

---

## Performance Issues on Large Repos

**Problem:** Scans take too long on large repositories.

**Solutions:**
```bash
# Limit scope
npx depcheck --ignore-dirs="node_modules,dist,coverage"

# Use incremental scanning
git diff --name-only HEAD~10 | xargs -I {} sh -c 'echo "Checking {}"'

# Parallelize with xargs
find src -name "*.ts" | xargs -P 4 -I {} grep -l "unused" {}
```

---

## When to Abort Cleanup

Stop the cleanup process if:

- Build fails and you cannot identify the cause
- Multiple files have unexpected references
- Core infrastructure files are detected as unused
- Git history shows file was recently restored after deletion
- User expresses uncertainty about any critical file

**Abort Command:**
```bash
# Restore all changes
git checkout .
git clean -fd

# Or restore from backup
git checkout backup/pre-cleanup-YYYY-MM-DD
git branch -D temp-cleanup-branch  # if created
```

---

## Reporting False Positives

When a detection tool reports a false positive, document it:

1. Add to `.sweepignore`
2. Record in `.agents/sweep.md` journal
3. Consider opening an issue with the tool maintainers
