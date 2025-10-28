# zkenc-js Benchmark 使用指南

## 本地運行

### 1. 安裝依賴

```bash
yarn install
```

### 2. 確保安裝 circom 和 snarkjs

#### 安裝 Circom

```bash
# macOS (使用 Homebrew)
brew install circom

# 或從源碼編譯
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

#### 安裝 snarkjs（已包含在 devDependencies 中）

```bash
npm install -g snarkjs
```

### 3. 編譯電路

```bash
yarn compile
```

這會編譯所有在 `compile.sh` 中列出的電路，生成：

- `.r1cs` 文件（R1CS 約束系統）
- `_js/` 目錄（WASM witness 生成器）
- `.sym` 文件（符號表）

### 4. 運行 Benchmark

```bash
yarn benchmark
```

測試完成後，結果會保存在 `benchmark-results.csv`。

## Docker 運行

### 方式一：使用輔助腳本（推薦）

```bash
./run-benchmark.sh
```

這個腳本會：

1. 構建 Docker 映像
2. 運行 benchmark
3. 將結果保存到本地的 `benchmark-results.csv`

### 方式二：手動操作

```bash
# 構建映像
docker build -t zkenc-benchmark .

# 運行 benchmark
docker run --rm \
  -v "$(pwd)/benchmark-results.csv:/app/benchmark-results.csv" \
  zkenc-benchmark

# 查看結果
cat benchmark-results.csv
```

## 在雲端服務器上運行

### AWS EC2 / GCP Compute Engine / Azure VM

1. **連接到服務器**

```bash
ssh user@your-server-ip
```

2. **安裝 Docker**

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

3. **上傳專案**

```bash
# 在本地機器上
scp -r zkenc-benchmark/ user@your-server-ip:~/
```

或使用 Git：

```bash
# 在服務器上
git clone https://github.com/your-username/zkenc-benchmark.git
cd zkenc-benchmark
```

4. **運行 Benchmark**

```bash
./run-benchmark.sh
```

5. **下載結果**

```bash
# 在本地機器上
scp user@your-server-ip:~/zkenc-benchmark/benchmark-results.csv ./
```

### 使用 GitHub Actions（CI/CD）

創建 `.github/workflows/benchmark.yml`：

```yaml
name: Benchmark

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t zkenc-benchmark .

      - name: Run benchmark
        run: |
          docker run --rm \
            -v "$(pwd)/benchmark-results.csv:/app/benchmark-results.csv" \
            zkenc-benchmark

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmark-results.csv
```

## 添加新電路

### 1. 創建電路目錄

```bash
mkdir my_circuit
cd my_circuit
```

### 2. 創建電路文件

創建 `my_circuit.circom`：

```circom
pragma circom 2.0.0;

template MyCircuit() {
    signal input publicInput;
    signal input privateInput;
    signal output result;

    result <== publicInput + privateInput;
}

component main {public [publicInput]} = MyCircuit();
```

### 3. 創建測試輸入

創建 `input.json`：

```json
{
  "publicInput": 10,
  "privateInput": 20
}
```

### 4. 在 compile.sh 中添加電路

編輯 `compile.sh`，在 `CIRCUITS` 陣列中添加：

```bash
CIRCUITS=("sudoku" "merkle_membership" "signature" "my_circuit")
```

### 5. 在 benchmark.mjs 中添加電路

編輯 `benchmark.mjs`，在 `CIRCUITS` 陣列中添加：

```javascript
const CIRCUITS = [
  { name: "sudoku", path: "sudoku" },
  { name: "merkle_membership", path: "merkle_membership" },
  { name: "signature", path: "signature" },
  { name: "my_circuit", path: "my_circuit" },
];
```

### 6. 編譯並測試

```bash
yarn compile
yarn benchmark
```

## 故障排除

### 問題：circom: command not found

**解決方案**：安裝 circom

```bash
# macOS
brew install circom

# Linux - 從源碼編譯
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

### 問題：Docker 構建失敗

**解決方案**：確保 Docker daemon 正在運行

```bash
# 檢查 Docker 狀態
docker ps

# macOS - 啟動 Docker Desktop
open -a Docker

# Linux - 啟動 Docker 服務
sudo systemctl start docker
```

### 問題：記憶體不足

**解決方案**：對於大型電路，增加 Docker 記憶體限制

```bash
docker run --rm \
  --memory="8g" \
  --memory-swap="8g" \
  -v "$(pwd)/benchmark-results.csv:/app/benchmark-results.csv" \
  zkenc-benchmark
```

### 問題：編譯時間過長

**解決方案**：電路編譯是一次性的，編譯後的檔案會被 Docker 緩存。後續運行會更快。

## 性能優化建議

1. **在雲端運行**：使用高性能 VM（如 c5.2xlarge）可以顯著減少測試時間
2. **並行測試**：修改 `benchmark.mjs` 來並行處理多個電路
3. **緩存編譯結果**：已編譯的電路可以在 Docker 層中緩存

## 支援

如有問題，請開啟 GitHub Issue 或參考 [zkenc-js 文檔](https://github.com/zkenc/zkenc-js)。
