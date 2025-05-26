# Dockerfile
FROM node:18-alpine

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptコンパイル
RUN npm run build

# ポート公開
EXPOSE 3000

# アプリケーション起動
CMD ["npm", "start"]
