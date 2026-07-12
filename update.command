#!/bin/bash
cd "$(dirname "$0")"

echo "⬇️  拉取最新代码..."
git pull

echo ""
echo "📦 打包中..."
npm run build

echo ""
echo "✅ 更新完成"
open dist/
