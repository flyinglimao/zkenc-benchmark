# zkenc-js Benchmark Docker Image
# 用於在雲端服務器上運行 benchmark

FROM node:22-slim

# 安裝必要的系統依賴
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# 安裝 circom 和 snarkjs
RUN curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# 安裝 circom
RUN git clone https://github.com/iden3/circom.git /tmp/circom && \
    cd /tmp/circom && \
    cargo build --release && \
    cargo install --path circom && \
    rm -rf /tmp/circom

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 yarn.lock (如果存在)
COPY package.json ./
COPY yarn.lock* ./
COPY .yarnrc.yml* ./
COPY .yarn* ./.yarn/

# 安裝 Node.js 依賴
RUN corepack enable && yarn install --immutable || yarn install

# 全局安裝 snarkjs
RUN npm install -g snarkjs

# 複製專案文件
COPY . .

# 賦予腳本執行權限
RUN chmod +x compile.sh

# 編譯所有電路
RUN ./compile.sh

# 設置入口點
ENTRYPOINT ["node", "benchmark.mjs"]

# 預設命令 (可以被覆蓋)
CMD []
