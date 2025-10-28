# zkenc-benchmark

zkenc-js 性能基準測試工具，用於測量零知識加密電路的性能指標。

## 📋 功能

該工具會針對每個電路生成以下指標：

- **電路限制數量（Constraints）**：電路的約束數量
- **公開輸入數量**：包含公開輸出的數量
- **隱私輸入數量**：私密輸入的數量
- **加密時間**：執行 encap 的時間（毫秒）
- **解密時間**：執行 decap 的時間（毫秒）
- **CipherText 大小**：密文的大小（bytes）

## 🚀 快速開始

### 前置需求

- Node.js 20+
- Yarn
- Circom 編譯器（用於編譯電路）
- snarkjs（用於分析電路）

### 安裝依賴

```bash
yarn install
```

### 編譯電路

```bash
yarn compile
# 或直接執行
./compile.sh
```

### 運行 Benchmark

```bash
yarn benchmark
```

測試結果會保存在 `benchmark-results.csv` 文件中。

## 📝 添加新電路

在 `benchmark.mjs` 文件中的 `CIRCUITS` 陣列添加新電路：

```javascript
const CIRCUITS = [
  { name: "sudoku", path: "sudoku" },
  { name: "merkle_membership", path: "merkle_membership" },
  { name: "signature", path: "signature" },
  // 添加你的新電路
  { name: "your_circuit", path: "your_circuit" },
];
```

確保電路目錄結構如下：

```
your_circuit/
├── your_circuit.circom    # 電路源碼
├── input.json            # 測試輸入
├── your_circuit.r1cs     # 編譯後的 R1CS（執行 compile.sh 生成）
├── your_circuit.sym      # 符號文件（執行 compile.sh 生成）
└── your_circuit_js/      # WASM witness 生成器（執行 compile.sh 生成）
    └── your_circuit.wasm
```

## 🐳 使用 Docker

### 構建並運行

使用提供的腳本一鍵構建和運行：

```bash
./run-benchmark.sh
```

或手動操作：

```bash
# 構建映像
docker build -t zkenc-benchmark .

# 運行 benchmark
docker run --rm \
  -v "$(pwd)/benchmark-results.csv:/app/benchmark-results.csv" \
  zkenc-benchmark
```

### 在雲端服務器上運行

1. 將專案上傳到雲端服務器
2. 安裝 Docker
3. 運行 `./run-benchmark.sh`

結果會自動保存到 `benchmark-results.csv`。

## 📊 輸出格式

CSV 文件包含以下欄位：

| Circuit Name | Constraints | Public Inputs | Private Inputs | Encrypt Time (ms) | Decrypt Time (ms) | Ciphertext Size (bytes) |
| ------------ | ----------- | ------------- | -------------- | ----------------- | ----------------- | ----------------------- |
| sudoku       | 12345       | 81            | 81             | 1234              | 567               | 89012                   |

## 🛠️ 開發

### 項目結構

```
zkenc-benchmark/
├── benchmark.mjs           # 主要的 benchmark 腳本
├── compile.sh             # 電路編譯腳本
├── genkey.mjs            # 範例：加解密示範
├── Dockerfile            # Docker 映像定義
├── .dockerignore         # Docker 忽略文件
├── run-benchmark.sh      # Docker 運行輔助腳本
├── package.json          # Node.js 依賴
└── [circuits]/           # 各個電路目錄
    ├── *.circom
    ├── input.json
    └── ...
```

### 腳本說明

- **compile.sh**：遍歷所有電路並使用 circom 編譯
- **benchmark.mjs**：執行性能測試並生成 CSV 報告
- **run-benchmark.sh**：在 Docker 中構建和運行 benchmark

## 📄 許可證

MIT
