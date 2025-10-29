# Groth16 Verifier Integration Guide

## 概述

Groth16 驗證器電路是一個**遞歸證明驗證器**，允許在 ZK 電路內驗證另一個 Groth16 證明。這是實現遞歸 ZK-SNARKs 的關鍵組件。

## 🔍 如何加入 Benchmark

### 第一步：準備電路文件

已完成 ✓

- `groth16_verifier/groth16.circom` - 主電路（已從 yi-sun/circom-pairing 複製）
- `groth16_verifier/simple_multiplier.circom` - 用於生成測試證明的簡單電路
- `groth16_verifier/generate_groth16_input.mjs` - 輸入生成腳本

### 第二步：生成測試證明

```bash
cd groth16_verifier
node generate_groth16_input.mjs
```

這個腳本會：
1. ✓ 編譯 simple_multiplier 電路
2. ✓ 生成 Powers of Tau
3. ✓ 創建 Groth16 proving key 和 verification key
4. ✓ 生成測試證明
5. ⚠️ 輸出原始 JSON 數據（需要手動轉換）

### 第三步：轉換證明格式 ⚠️

**這是最複雜的部分！**

snarkjs 生成的證明格式與 circom-pairing 所需的格式不同。需要轉換：

#### 需要轉換的數據：

1. **Verification Key**:
   - `vk_alpha_1` → (需要計算配對) → `negalfa1xbeta2[6][2][k]`
   - `vk_beta_2` → (與 alpha1 配對)
   - `vk_gamma_2` → `gamma2[2][2][k]`
   - `vk_delta_2` → `delta2[2][2][k]`
   - `IC` 點陣列 → `IC[publicInputCount+1][2][k]`

2. **Proof**:
   - `pi_a` → `negpa[2][k]` (需要取負)
   - `pi_b` → `pb[2][2][k]`
   - `pi_c` → `pc[2][k]`
   - 公開輸入 → `pubInput[publicInputCount]`

#### 轉換細節：

每個座標需要：
- 轉換為 BigInt
- 分解為 k=6 個 43-bit 的 limbs
- 對於 Fp2 元素，需要處理實部和虛部
- 對於配對結果（Fp12），需要 6×2×k 的結構

#### 轉換工具選項：

**選項 A：使用 Python 腳本**（推薦）

```bash
# 使用 circom-pairing 的 Python 工具
cd ../temp_circom_pairing/python
python3
>>> from curve import *
>>> from field_helper import *
# 手動轉換每個點...
```

**選項 B：使用 JavaScript 庫**

需要實現 BN254 曲線運算和多精度算術的轉換器。

**選項 C：使用預生成的測試數據**

從 circom-pairing 項目中查找現有的測試輸入。

### 第四步：創建 groth16_verifier.circom 包裝器

需要創建一個包裝電路來實例化 `verifyProof` 模板：

```circom
pragma circom 2.0.3;

include "./groth16.circom";

// 對於 simple_multiplier，publicInputCount = 1 (只有 c 是公開的)
component main = verifyProof(1);
```

### 第五步：將電路加入 Benchmark

1. **更新 compile.sh**:
   ```bash
   CIRCUITS=("sudoku" "merkle_membership" "signature" "keccak_256" "groth16_verifier")
   ```

2. **更新 benchmark.mjs**:
   ```javascript
   const CIRCUITS = [
     // ... existing circuits
     { name: "groth16_verifier", path: "groth16_verifier" },
   ];
   ```

3. **準備依賴**:
   - 確保 `temp_circom_pairing/circuits` 在電路 include 路徑中
   - 編譯時使用：`-l ../temp_circom_pairing/circuits`

## 🚧 挑戰與限制

### 1. 電路規模

- **約束數**: ~10-15M（取決於 publicInputCount）
- **編譯時間**: 1-2 小時
- **記憶體需求**: 32GB+
- **Proving key 大小**: 6-10GB

### 2. 格式轉換複雜

snarkjs 的輸出格式與 circom-pairing 不兼容，需要：
- 理解 BN254 曲線的數學結構
- 實現多精度整數轉換
- 計算配對 e(-α₁, β₂)

### 3. 依賴管理

- 需要保留 `temp_circom_pairing` 目錄作為庫
- 或者複製所有依賴電路到項目中

## 💡 建議的替代方案

### 方案 A：使用更簡單的驗證電路

考慮使用其他驗證器：
- EdDSA 簽名驗證（已在 signature/ 中）
- Merkle proof 驗證（已在 merkle_membership/ 中）
- Hash 預像驗證（已在 keccak_256/ 中）

### 方案 B：簡化的 Groth16 驗證

創建一個不完整但功能性的驗證器，跳過某些子群檢查以減少約束。

### 方案 C：外部工具協助

開發獨立的轉換工具來處理格式轉換，然後再整合到 benchmark。

## 📚 參考資源

- [circom-pairing GitHub](https://github.com/yi-sun/circom-pairing)
- [circom-pairing 文檔](https://github.com/yi-sun/circom-pairing/tree/master/docs)
- [BN254 曲線](https://hackmd.io/@jpw/bn254)
- [Groth16 論文](https://eprint.iacr.org/2016/260.pdf)
- [snarkjs 文檔](https://github.com/iden3/snarkjs)

## 📝 下一步行動

基於當前進展，我建議：

1. **短期**：先完成其他電路的 benchmark（sudoku, merkle_membership, signature, keccak_256 都比較簡單）

2. **中期**：開發格式轉換工具
   - 創建 JS/TS 腳本來轉換 snarkjs 輸出
   - 或使用 circom-pairing 的 Python 工具

3. **長期**：完整整合 Groth16 驗證器
   - 在高配置機器上編譯
   - 運行完整 benchmark

## 🎯 目前狀態

✅ 已完成：
- 研究 Groth16 電路結構
- 創建測試電路
- 設置基本的目錄結構
- 創建證明生成腳本框架

⚠️ 待完成：
- 實現格式轉換工具
- 生成實際的 input.json
- 編譯 Groth16 驗證器電路
- 整合到 benchmark 系統

是否要繼續完成 Groth16 整合，還是先專注於其他更簡單的電路？
