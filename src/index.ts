
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testDatabaseConnection, initializeDatabase, pool } from '@/config/database';
import { Logger } from '@/config/logger';
import { errorHandler } from '@/middleware/error-handler';
import { initializeDI, DIContainer } from '@/infrastructure/dependency-injection';
import { TaskService } from '@/services/task-service';
import { EventStore } from '@/types/core';
import { TaskPriority } from '@/types/task';

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
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0 - Event Store Edition'
  });
});

// API情報エンドポイント
app.get('/api/info', (req, res) => {
  res.json({
    name: 'CQRS Task Manager API',
    version: '2.0.0',
    description: 'Command Query Responsibility Segregation with Event Store',
    phase: 'Phase 2 - Event Store Implementation',
    features: [
      'Event Sourcing',
      'Aggregate Root Pattern',
      'Domain Events', 
      'Optimistic Concurrency Control',
      'Event Store with PostgreSQL'
    ],
    endpoints: {
      health: '/health',
      demo: '/api/demo/*',
      eventStore: '/api/event-store/*'
    }
  });
});

// Event Store統計情報エンドポイント
app.get('/api/event-store/statistics', async (req, res, next) => {
  try {
    const container = DIContainer.getInstance();
    const eventStore = container.get<EventStore>('EventStore');
    const stats = await (eventStore as any).getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// 集約のイベント履歴取得
app.get('/api/event-store/events/:aggregateId', async (req, res, next) => {
  try {
    const { aggregateId } = req.params;
    const fromVersion = parseInt(req.query.fromVersion as string) || 0;
    
    const container = DIContainer.getInstance();
    const eventStore = container.get<EventStore>('EventStore');
    const events = await eventStore.getEvents(aggregateId, fromVersion);
    
    res.json({
      success: true,
      data: {
        aggregateId,
        eventCount: events.length,
        events: events.map(event => ({
          id: event.id,
          eventType: event.eventType,
          version: event.version,
          timestamp: event.timestamp,
          payload: event.payload,
          metadata: event.metadata
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// デモ用エンドポイント - タスク作成
app.post('/api/demo/create-task', async (req, res, next) => {
  try {
    const { title, description, priority, createdBy } = req.body;
    
    // バリデーション
    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Title is required and must be a string' }
      });
    }

    const container = DIContainer.getInstance();
    const taskService = container.get<TaskService>('TaskService');
    
    const taskId = await taskService.createTask({
      title,
      description,
      priority: priority || TaskPriority.MEDIUM,
      createdBy
    });

    res.status(201).json({
      success: true,
      data: {
        taskId,
        message: 'Task created successfully'
      }
    });
  } catch (error) {
    next(error);
  }
});

// デモ用エンドポイント - タスク完了
app.post('/api/demo/complete-task/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { completedBy, completionNote } = req.body;
    
    const container = DIContainer.getInstance();
    const taskService = container.get<TaskService>('TaskService');
    
    await taskService.completeTask(taskId, {
      completedBy,
      completionNote
    });

    res.json({
      success: true,
      data: {
        message: 'Task completed successfully'
      }
    });
  } catch (error) {
    next(error);
  }
});

// デモ用エンドポイント - タスクキャンセル
app.post('/api/demo/cancel-task/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { reason, cancelledBy } = req.body;
    
    const container = DIContainer.getInstance();
    const taskService = container.get<TaskService>('TaskService');
    
    await taskService.cancelTask(taskId, {
      reason,
      cancelledBy
    });

    res.json({
      success: true,
      data: {
        message: 'Task cancelled successfully'
      }
    });
  } catch (error) {
    next(error);
  }
});

// デモ用エンドポイント - タスク更新
app.put('/api/demo/update-task/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title, description, priority, updatedBy } = req.body;
    
    const container = DIContainer.getInstance();
    const taskService = container.get<TaskService>('TaskService');
    
    await taskService.updateTask(taskId, {
      title,
      description,
      priority
    }, updatedBy);

    res.json({
      success: true,
      data: {
        message: 'Task updated successfully'
      }
    });
  } catch (error) {
    next(error);
  }
});

// デモ用エンドポイント - タスク存在確認
app.get('/api/demo/task-exists/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    const container = DIContainer.getInstance();
    const taskService = container.get<TaskService>('TaskService');
    
    const exists = await taskService.taskExists(taskId);

    res.json({
      success: true,
      data: {
        taskId,
        exists
      }
    });
  } catch (error) {
    next(error);
  }
});

// CQRSパターンデモ用エンドポイント
app.post('/api/demo/cqrs-scenario', async (req, res, next) => {
  try {
    const container = DIContainer.getInstance();
    const taskService = container.get<TaskService>('TaskService');
    const eventStore = container.get<EventStore>('EventStore');
    
    // シナリオ実行
    Logger.info('Starting CQRS demonstration scenario');
    
    // 1. タスク作成
    const taskId1 = await taskService.createTask({
      title: 'CQRS Demo Task 1',
      description: 'イベントソーシングのデモンストレーション',
      priority: TaskPriority.HIGH,
      createdBy: 'demo-user'
    });
    
    const taskId2 = await taskService.createTask({
      title: 'CQRS Demo Task 2', 
      description: '集約パターンのデモンストレーション',
      priority: TaskPriority.MEDIUM,
      createdBy: 'demo-user'
    });

    // 2. 1つ目のタスクを更新
    await taskService.updateTask(taskId1, {
      title: 'Updated CQRS Demo Task 1',
      priority: TaskPriority.LOW
    }, 'demo-user');

    // 3. 2つ目のタスクを完了
    await taskService.completeTask(taskId2, {
      completedBy: 'demo-user',
      completionNote: 'デモンストレーション完了'
    });

    // 4. イベント履歴を取得
    const events1 = await eventStore.getEvents(taskId1);
    const events2 = await eventStore.getEvents(taskId2);
    
    // 5. 統計情報を取得
    const stats = await (eventStore as any).getStatistics();

    res.json({
      success: true,
      data: {
        message: 'CQRS demonstration completed successfully',
        scenario: {
          createdTasks: [taskId1, taskId2],
          operations: [
            'Task 1: Created -> Updated',
            'Task 2: Created -> Completed'
          ]
        },
        eventHistory: {
          task1: {
            taskId: taskId1,
            eventCount: events1.length,
            events: events1.map(e => ({
              eventType: e.eventType,
              version: e.version,
              timestamp: e.timestamp
            }))
          },
          task2: {
            taskId: taskId2,
            eventCount: events2.length,
            events: events2.map(e => ({
              eventType: e.eventType,
              version: e.version,
              timestamp: e.timestamp
            }))
          }
        },
        eventStoreStatistics: stats
      }
    });
  } catch (error) {
    next(error);
  }
});

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
    
    // 依存性注入初期化
    initializeDI(pool);
    
    // サーバー起動
    app.listen(PORT, () => {
      Logger.info(`🚀 CQRS Task Manager Server (Phase 2) is running on port ${PORT}`);
      Logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      Logger.info(`📖 API info: http://localhost:${PORT}/api/info`);
      Logger.info(`🎯 Demo scenario: POST http://localhost:${PORT}/api/demo/cqrs-scenario`);
      Logger.info(`📈 Event Store stats: GET http://localhost:${PORT}/api/event-store/statistics`);
      Logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      Logger.info('');
      Logger.info('🎓 Phase 2 Features:');
      Logger.info('  ✅ Event Store Implementation');
      Logger.info('  ✅ Aggregate Root Pattern');
      Logger.info('  ✅ Domain Events');
      Logger.info('  ✅ Optimistic Concurrency Control');
      Logger.info('  ✅ Event Sourcing');
      Logger.info('');
      Logger.info('🧪 Try these demo endpoints:');
      Logger.info('  POST /api/demo/create-task');
      Logger.info('  POST /api/demo/complete-task/:taskId');
      Logger.info('  POST /api/demo/cqrs-scenario');
      Logger.info('  GET /api/event-store/events/:taskId');
    });
    
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  pool.end().then(() => {
    Logger.info('Database connections closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  pool.end().then(() => {
    Logger.info('Database connections closed');
    process.exit(0);
  });
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