# CQRS Task Manager Backend

Command Query Responsibility Segregation (CQRS) パターンを学習するためのタスク管理システムのバックエンドAPI実装です。

## 🎯 学習目標

- **CQRS パターン**の理解と実装
- **Event Sourcing**の基本概念
- **TypeScript**による型安全な開発
- **PostgreSQL**を使用したEvent Store設計
- **ドメイン駆動設計（DDD）**の実践

## 🏗️ アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │────│   API Gateway   │────│   Command Bus   │
│   (Frontend)    │    │   (Express.js)  │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Query Side    │    │  Command Side   │
                       │  (Read Model)   │    │ (Write Model)   │
                       │                 │    │                 │
                       │ - Task Views    │    │ - Aggregates    │
                       │ - Statistics    │    │ - Domain Logic  │
                       │ - Projections   │    │ - Events        │
                       └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │────│   Event Store   │
# CQRS Task Manager Backend - Phase 2 完成版

Command Query Responsibility Segregation (CQRS) + Event Sourcing パターンを学習するためのタスク管理システムのバックエンドAPI実装です。

## 🎯 学習目標達成状況

- ✅ **CQRS パターン**の理解と実装
- ✅ **Event Sourcing**の基本概念と実装
- ✅ **TypeScript**による型安全な開発
- ✅ **PostgreSQL**を使用したEvent Store設計
- ✅ **ドメイン駆動設計（DDD）**の実践

## 🏗️ アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │────│   API Gateway   │────│   Command Bus   │
│   (Frontend)    │    │   (Express.js)  │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Query Side    │    │  Command Side   │
                       │  (Read Model)   │    │ (Write Model)   │
                       │                 │    │                 │
                       │ - Task Views    │    │ - Aggregates    │
                       │ - Statistics    │    │ - Domain Logic  │
                       │ - Projections   │    │ - Events        │
                       └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │────│   Event Store   │
                       │  (Task Views)   │    │  (PostgreSQL)   │
                       └─────────────────┘    └─────────────────┘
```

## 📁 実装済み機能

```
src/
├── types/              # 型定義
│   ├── core.ts         # CQRS基本型 ✅
│   └── task.ts         # タスクドメイン型 ✅
├── events/             # ドメインイベント
│   └── task-events.ts  # タスクイベント定義 ✅
├── domain/             # ドメインロジック
│   └── task-aggregate.ts # タスク集約 ✅
├── infrastructure/     # インフラストラクチャ
│   ├── event-store.ts  # Event Store実装 ✅
│   ├── task-repository.ts # リポジトリ ✅
│   ├── event-bus.ts    # イベントバス ✅
│   └── dependency-injection.ts # DI ✅
├── services/           # アプリケーションサービス
│   └── task-service.ts # タスクサービス ✅
├── utils/              # ユーティリティ
│   ├── event-factory.ts # イベント作成 ✅
│   └── validation.ts   # バリデーション ✅
├── config/             # 設定
│   ├── database.ts     # DB設定 ✅
│   └── logger.ts       # ログ設定 ✅
├── middleware/         # ミドルウェア
│   └── error-handler.ts ✅
├── __tests__/          # テスト ✅
└── index.ts           # メインサーバー ✅
```

## 🚀 セットアップ手順

### 1. 環境構築

```bash
# プロジェクト作成
mkdir cqrs-task-manager-backend
cd cqrs-task-manager-backend

# 依存関係インストール
npm install express pg uuid cors helmet dotenv
npm install -D @types/express @types/node @types/pg @types/uuid @types/cors typescript ts-node-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser jest @types/jest ts-jest

# TypeScript設定
npx tsc --init
```

### 2. データベース起動

```bash
# PostgreSQL起動
docker-compose up -d postgres

# 接続確認
docker exec -it cqrs-postgres psql -U user -d cqrs_taskmanager
```

### 3. 開発サーバー起動

```bash
# 開発モード
npm run dev

# 本番ビルド
npm run build && npm start
```

## 📊 動作確認用API

### Phase 2実装済み

**基本情報**
- `GET /health` - サーバーヘルスチェック
- `GET /api/info` - API機能情報

**Event Store操作**
- `GET /api/event-store/statistics` - Event Store統計
- `GET /api/event-store/events/:aggregateId` - イベント履歴取得

**CQRSデモンストレーション**
- `POST /api/demo/cqrs-scenario` - 完全なCQRSフロー実行
- `POST /api/demo/create-task` - タスク作成
- `POST /api/demo/complete-task/:taskId` - タスク完了
- `POST /api/demo/cancel-task/:taskId` - タスクキャンセル
- `PUT /api/demo/update-task/:taskId` - タスク更新
- `GET /api/demo/task-exists/:taskId` - 存在確認

## 🧪 動作テスト

### 基本動作確認

```bash
# 1. サーバー起動確認
curl http://localhost:3000/health

# 2. CQRSデモ実行
curl -X POST http://localhost:3000/api/demo/cqrs-scenario

# 3. Event Store統計確認
curl http://localhost:3000/api/event-store/statistics
```

### 個別機能テスト

```bash
# タスク作成
curl -X POST http://localhost:3000/api/demo/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Phase 2テストタスク",
    "description": "Event Sourcingの動作確認",
    "priority": "high",
    "createdBy": "test-user"
  }'

# 返されたtaskIdでイベント履歴確認
curl http://localhost:3000/api/event-store/events/[taskId]
```

## 🎓 実装したCQRS機能

### ✅ Event Sourcing
- すべての状態変更をイベントとして永続化
- イベントから任意時点の状態を復元可能
- 完全な監査ログの自動生成

### ✅ Aggregate Pattern
- ビジネスルールをドメインオブジェクト内で保護
- 不整合な状態変更を防止
- ドメインロジックの集約化

### ✅ Optimistic Concurrency Control
- バージョン番号による楽観的ロック
- 高パフォーマンスな並行制御
- データ整合性の保証

### ✅ Event Store
- PostgreSQLベースの高性能イベント永続化
- インデックス最適化による高速クエリ
- トランザクション保証による安全性

### ✅ Repository Pattern
- 集約の永続化を抽象化
- インフラストラクチャとドメインの分離
- テスタビリティの向上

### ✅ Dependency Injection
- 疎結合なアーキテクチャ
- テスト容易性の向上
- 設定の一元管理

## 🔧 開発・テストコマンド

```bash
# 開発
npm run dev              # 開発サーバー起動
npm run build            # TypeScriptビルド
npm run type-check       # 型チェック
npm run lint             # コード品質チェック

# テスト
npm test                 # 単体テスト実行
npm run test:coverage    # カバレッジ付きテスト
npm run test:watch       # テスト監視モード
```

## 📈 期待される学習成果

### Phase 2完了時点で習得できるスキル

1. **Event Sourcing**の設計・実装能力
2. **CQRS**パターンの理解と適用
3. **ドメイン駆動設計**の実践
4. **TypeScript**による型安全な開発
5. **PostgreSQL**によるイベント永続化
6. **並行制御**の理解と実装
7. **テスト駆動開発**の実践

### ビジネス価値

- **完全な監査ログ**: すべての操作履歴が自動記録
- **高い拡張性**: 新機能追加時の影響範囲を最小化
- **データ整合性**: 楽観的ロックによる安全な並行処理
- **障害復旧**: イベントから任意時点の状態復元
- **分析基盤**: イベントストリームからのビジネスインサイト

## 🚀 次のステップ

### Phase 3: Command/Query完全分離
- 専用Command/Queryハンドラー
- Read Model最適化
- パフォーマンス向上

### Phase 4: 高度なプロジェクション
- リアルタイムプロジェクション
- イベント再生機能
- スナップショット機能

## 🎯 トラブルシューティング

### よくある問題

**楽観的ロックエラー**
```
Concurrency conflict: Expected version X, but current version is Y
```
→ 複数の操作が同時実行された。正常な動作です。

**データベース接続エラー**
```bash
# PostgreSQL起動確認
docker-compose ps
docker-compose up -d postgres
```

**TypeScriptエラー**
```bash
# 型チェック実行
npm run type-check
```

## 📚 参考資料

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Domain-Driven Design](https://domainlanguage.com/ddd/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 📝 ライセンス

MIT License
