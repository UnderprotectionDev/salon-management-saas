# Sweep Exclusion Patterns Reference

Directories and files that should never be scanned or deleted.

---

## Directories to Exclude from Scan

```
# Package managers
node_modules/
vendor/
.venv/
venv/
__pycache__/

# Version control
.git/
.svn/
.hg/

# Build outputs (scan but don't manually delete)
dist/
build/
out/
.next/
.nuxt/

# IDE/Editor
.idea/
.vscode/
*.swp
*.swo

# Cache
.cache/
.parcel-cache/
.turbo/
```

---

## Files Never to Delete

```
# Critical project files
LICENSE*
LICENCE*
CHANGELOG*
SECURITY*
CONTRIBUTING*

# Lock files (managed by package managers)
package-lock.json
yarn.lock
pnpm-lock.yaml
Gemfile.lock
poetry.lock
go.sum

# Environment files (may contain secrets)
.env*
*.local

# Git files
.gitignore
.gitattributes
.gitmodules

# CI/CD (verify before suggesting removal)
.github/
.gitlab-ci.yml
.circleci/
Jenkinsfile
```

---

## .sweepignore Template

Create a `.sweepignore` file in project root to customize exclusions:

```
# Project-specific exclusions for Sweep

# Third-party code (vendored)
src/vendor/

# Generated code
src/generated/

# Legacy code under migration (temporary)
src/legacy/

# Public assets (referenced dynamically)
public/images/icons/

# Localization files (loaded at runtime)
locales/
```
