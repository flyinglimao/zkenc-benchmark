# Groth16 Verifier Circuit

這個電路用於在 ZK 電路內驗證另一個 Groth16 證明（遞歸證明）。

## 來源

電路來自 [yi-sun/circom-pairing](https://github.com/yi-sun/circom-pairing)，實現了 BN254 曲線上的 Groth16 驗證器。

## 複雜度警告

⚠️ **這是一個非常大的電路！**

- 預計約束數量：10M+
- 編譯時間：數小時
- 需要大量記憶體和儲存空間
- 證明生成時間：分鐘級別

建議在高配置機器上運行（32核心，256GB RAM）。

## 輸入生成

要生成此電路的輸入，需要：

1. 創建一個簡單的"內部電路"（我們使用 simple_multiplier.circom）
2. 為內部電路生成 Groth16 證明和驗證密鑰
3. 提取並轉換證明參數為 circom-pairing 格式
4. 使用 `generate_groth16_input.mjs` 腳本自動完成此過程

## 如何使用

```bash
# 1. 安裝依賴
cd groth16_verifier
npm install

# 2. 生成輸入（這會創建一個簡單電路並生成其 Groth16 證明）
node generate_groth16_input.mjs

# 3. 編譯電路（需要很長時間！）
circom groth16_verifier.circom --r1cs --wasm --sym --output . -l ../node_modules -l ../temp_circom_pairing/circuits

# 4. 運行 benchmark
cd ..
yarn benchmark
```

## 輸入結構

input.json 包含：

- **verification key**:
  - `negalfa1xbeta2`: 預計算的配對 e(-α₁, β₂)
  - `gamma2`, `delta2`: G2 點
  - `IC`: 輸入承諾點數組

- **proof**:
  - `negpa`: G1 點（-A）
  - `pb`: G2 點（B）
  - `pc`: G1 點（C）
  - `pubInput`: 公開輸入數組

所有點都以 BN254 曲線的多精度整數數組格式表示。
