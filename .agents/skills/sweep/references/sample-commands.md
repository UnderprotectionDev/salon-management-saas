# Sample Commands

## 依存関係分析

```bash
# TypeScript/JavaScript - 未使用エクスポート検出
npx ts-prune

# 未使用依存関係の検出
npx depcheck

# 包括的な未使用コード検出
npx knip

# npm パッケージサイズ確認
npm ls --all --production
```

## ファイル分析

```bash
# 重複ファイルの検出（MD5ハッシュ）
find . -type f -not -path '*/node_modules/*' -exec md5 -r {} \; | sort | uniq -d -w32

# 大きなファイルの検出（100KB以上）
find . -type f -size +100k -not -path '*/node_modules/*' -not -path '*/.git/*'

# 最近変更されていないファイル（90日以上）
find . -type f -mtime +90 -not -path '*/node_modules/*'

# 孤立ファイル候補（インポートされていない .ts ファイル）
for f in $(find src -name "*.ts" -not -name "*.d.ts"); do
  base=$(basename "$f" .ts)
  grep -rq "from.*['\"].*$base['\"]" src/ || echo "Orphan: $f"
done
```

## プロジェクト固有ツールの発見

```bash
# package.json のスクリプトを確認
cat package.json | jq '.scripts'

# lint/format 関連の設定ファイルを確認
ls -la .*rc* .*.js .*.json 2>/dev/null

# CI/CD で使用されているツールを確認
cat .github/workflows/*.yml 2>/dev/null | grep -E "npm|yarn|pnpm"
```
