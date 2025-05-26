
import { Pool } from 'pg';
import { PostgreSQLEventStore } from './event-store';
import { EventSourcedTaskRepository, TaskRepository } from './task-repository';
import { InMemoryEventBus } from './event-bus';
import { TaskService } from '@/services/task-service';
import { EventStore, EventBus } from '@/types/core';

/**
 * DIコンテナ
 * 
 * 依存関係の管理と注入を行う
 */
export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * サービスを登録
   */
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  /**
   * サービスを取得（Singleton）
   */
  get<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service not found: ${key}`);
    }

    const instanceKey = `instance_${key}`;
    if (!this.services.has(instanceKey)) {
      this.services.set(instanceKey, factory());
    }

    return this.services.get(instanceKey);
  }

  /**
   * 新しいインスタンスを取得
   */
  create<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service not found: ${key}`);
    }
    return factory();
  }
}

/**
 * DIコンテナの初期化
 */
export function initializeDI(pool: Pool): void {
  const container = DIContainer.getInstance();

  // Event Store
  container.register<EventStore>('EventStore', () => 
    new PostgreSQLEventStore(pool)
  );

  // Event Bus
  container.register<EventBus>('EventBus', () => 
    new InMemoryEventBus()
  );

  // Task Repository
  container.register<TaskRepository>('TaskRepository', () => 
    new EventSourcedTaskRepository(container.get<EventStore>('EventStore'))
  );

  // Task Service
  container.register<TaskService>('TaskService', () => 
    new TaskService(
      container.get<TaskRepository>('TaskRepository'),
      container.get<EventBus>('EventBus')
    )
  );
}
