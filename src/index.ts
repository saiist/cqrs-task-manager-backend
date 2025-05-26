
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testDatabaseConnection, initializeDatabase } from '@/config/database';
import { Logger } from '@/config/logger';
import { errorHandler } from '@/middleware/error-handler';

// 環境変数読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


// ミドルウェア設定
app.use(helmet()); // セキュリティヘッダー
app.use(cors()); // CORS設定
app.use(express.json({ limit: '10mb' })); // JSON パース
app.use(express.urlencoded({ extended: true })); // URL エンコード

// リクエストログ
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: Object.keys(req.body).length > 0 ? req.body : undefined
  });
  next();
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API情報エンドポイント
app.get('/api/info', (req, res) => {
  res.json({
    name: 'CQRS Task Manager API',
    version: '1.0.0',
    description: 'Command Query Responsibility Segregation パターンの実装例',
    endpoints: {
      health: '/health',
      commands: '/api/commands/*',
      queries: '/api/queries/*',
      events: '/api/events/*'
    }
  });
});

// TODO: ルート設定（次のフェーズで実装）
// app.use('/api/commands', commandRoutes);
// app.use('/api/queries', queryRoutes);
// app.use('/api/events', eventRoutes);

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      type: 'NotFoundError'
    }
  });
});

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
async function startServer(): Promise<void> {
  try {
    // データベース接続テスト
    await testDatabaseConnection();
    
    // データベース初期化
    await initializeDatabase();
    
    // サーバー起動
    app.listen(PORT, () => {
      Logger.info(`🚀 Server is running on port ${PORT}`);
      Logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      Logger.info(`📖 API info: http://localhost:${PORT}/api/info`);
      Logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// 未処理エラーのキャッチ
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// サーバー起動
startServer();
