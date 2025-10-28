#!/bin/bash

# 在 Docker 中運行 benchmark 的輔助腳本

set -e

IMAGE_NAME="zkenc-benchmark"
CONTAINER_NAME="zkenc-benchmark-run"

echo "🐳 構建 Docker 映像..."
docker build -t ${IMAGE_NAME} .

echo ""
echo "🚀 運行 benchmark..."
docker run --rm \
    --name ${CONTAINER_NAME} \
    -v "$(pwd)/benchmark-results.csv:/app/benchmark-results.csv" \
    ${IMAGE_NAME}

echo ""
echo "✅ Benchmark 完成！結果已保存至 benchmark-results.csv"
