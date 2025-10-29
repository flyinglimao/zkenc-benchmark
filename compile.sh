#!/bin/bash

# 電路編譯腳本
# 使用 circom 編譯所有電路

set -e  # 遇到錯誤時停止

# 顏色輸出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}開始編譯電路...${NC}"

# 電路列表
CIRCUITS=("sudoku" "merkle_membership" "signature" "keccak_256" "groth16_verifier")

for circuit in "${CIRCUITS[@]}"; do
    echo -e "\n${GREEN}編譯 ${circuit}...${NC}"

    # 檢查電路文件是否存在
    if [ ! -f "${circuit}/${circuit}.circom" ]; then
        echo "警告: ${circuit}/${circuit}.circom 不存在，跳過"
        continue
    fi

    # groth16_verifier 是一個非常大的電路
    if [ "${circuit}" = "groth16_verifier" ]; then
        echo "⚠️  Groth16 verifier 是一個非常大的電路，編譯可能需要數小時"
        echo "   如果不需要，可以在 compile.sh 中註釋掉此電路"
        echo "   預計約束數: ~10-15M"
    fi

    # 編譯電路
    # --r1cs: 生成 R1CS 文件
    # --wasm: 生成 WASM witness 生成器
    # --sym: 生成符號文件
    # --output: 指定輸出目錄
    circom "${circuit}/${circuit}.circom" \
        --r1cs \
        --wasm \
        --sym \
        --output "${circuit}" \
        -l node_modules

    echo -e "${GREEN}✓ ${circuit} 編譯完成${NC}"
done

echo -e "\n${BLUE}所有電路編譯完成！${NC}"
