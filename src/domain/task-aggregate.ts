
import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot, DomainEvent } from '@/types/core';
import { TaskPriority, TaskStatus, TaskEntity } from '@/types/task';
import { TaskCreatedEvent, TaskCompletedEvent, TaskCancelledEvent, TaskUpdatedEvent, TaskEvent } from '@/events/task-events';
import { ValidationError } from '@/middleware/error-handler';

/**
 * タスク集約
 * 
 * 責務:
 * - タスクのビジネスルールを保護
 * - ドメインイベントの生成
 * - 不変条件の維持
 */
export class TaskAggregate extends AggregateRoot {
  private _title: string = '';
  private _description?: string;
  private _priority: TaskPriority = TaskPriority.MEDIUM;
  private _status: TaskStatus = TaskStatus.PENDING;
  private _createdAt: Date = new Date();
  private _updatedAt: Date = new Date();
  private _completedAt?: Date;
  private _cancelledAt?: Date;

  constructor(id?: string) {
    super(id || uuidv4());
  }

  // Getters（読み取り専用）
  get title(): string { return this._title; }
  get description(): string | undefined { return this._description; }
  get priority(): TaskPriority { return this._priority; }
  get status(): TaskStatus { return this._status; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get completedAt(): Date | undefined { return this._completedAt; }
  get cancelledAt(): Date | undefined { return this._cancelledAt; }

  /**
   * 新しいタスクを作成
   * 
   * @param title タスクタイトル
   * @param description 説明（オプション）
   * @param priority 優先度
   * @param createdBy 作成者（オプション）
   */
  static createNew(
    title: string,
    description?: string,
    priority: TaskPriority = TaskPriority.MEDIUM,
    createdBy?: string
  ): TaskAggregate {
    // バリデーション
    if (!title || title.trim().length === 0) {
      throw new ValidationError('Task title is required', 'title');
    }

    if (title.length > 255) {
      throw new ValidationError('Task title must be less than 255 characters', 'title');
    }

    if (description && description.length > 1000) {
      throw new ValidationError('Task description must be less than 1000 characters', 'description');
    }

    // 新しい集約インスタンス作成
    const task = new TaskAggregate();
    const now = new Date();

    // ドメインイベント生成
    const event: TaskCreatedEvent = {
      id: uuidv4(),
      aggregateId: task.id,
      eventType: 'TaskCreated',
      version: 1,
      timestamp: now,
      payload: {
        title: title.trim(),
        description: description?.trim(),
        priority,
        createdBy
      },
      metadata: {
        source: 'TaskAggregate.createNew',
        timestamp: now.toISOString()
      }
    };

    // イベントを発生
    task.raiseEvent(event);

    return task;
  }

  /**
   * タスクを完了にする
   * 
   * @param completedBy 完了者（オプション）
   * @param completionNote 完了メモ（オプション）
   */
  complete(completedBy?: string, completionNote?: string): void {
    // ビジネスルールチェック
    if (this._status !== TaskStatus.PENDING) {
      throw new ValidationError(
        `Cannot complete task in ${this._status} status`,
        'status'
      );
    }

    const now = new Date();

    // ドメインイベント生成
    const event: TaskCompletedEvent = {
      id: uuidv4(),
      aggregateId: this.id,
      eventType: 'TaskCompleted',
      version: this._version + 1,
      timestamp: now,
      payload: {
        completedBy,
        completionNote
      },
      metadata: {
        source: 'TaskAggregate.complete',
        timestamp: now.toISOString()
      }
    };

    // イベントを発生
    this.raiseEvent(event);
  }

  /**
   * タスクをキャンセルする
   * 
   * @param reason キャンセル理由（オプション）
   * @param cancelledBy キャンセル者（オプション）
   */
  cancel(reason?: string, cancelledBy?: string): void {
    // ビジネスルールチェック
    if (this._status === TaskStatus.COMPLETED) {
      throw new ValidationError(
        'Cannot cancel completed task',
        'status'
      );
    }

    if (this._status === TaskStatus.CANCELLED) {
      throw new ValidationError(
        'Task is already cancelled',
        'status'
      );
    }

    const now = new Date();

    // ドメインイベント生成
    const event: TaskCancelledEvent = {
      id: uuidv4(),
      aggregateId: this.id,
      eventType: 'TaskCancelled',
      version: this._version + 1,
      timestamp: now,
      payload: {
        reason,
        cancelledBy
      },
      metadata: {
        source: 'TaskAggregate.cancel',
        timestamp: now.toISOString()
      }
    };

    // イベントを発生
    this.raiseEvent(event);
  }

  /**
   * タスク情報を更新
   * 
   * @param updates 更新情報
   * @param updatedBy 更新者（オプション）
   */
  update(
    updates: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
    },
    updatedBy?: string
  ): void {
    // ビジネスルールチェック
    if (this._status !== TaskStatus.PENDING) {
      throw new ValidationError(
        `Cannot update task in ${this._status} status`,
        'status'
      );
    }

    // バリデーション
    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length === 0) {
        throw new ValidationError('Task title is required', 'title');
      }
      if (updates.title.length > 255) {
        throw new ValidationError('Task title must be less than 255 characters', 'title');
      }
    }

    if (updates.description !== undefined && updates.description.length > 1000) {
      throw new ValidationError('Task description must be less than 1000 characters', 'description');
    }

    // 変更があるかチェック
    const hasChanges = 
      (updates.title !== undefined && updates.title.trim() !== this._title) ||
      (updates.description !== undefined && updates.description?.trim() !== this._description) ||
      (updates.priority !== undefined && updates.priority !== this._priority);

    if (!hasChanges) {
      // 変更がない場合はイベントを生成しない
      return;
    }

    const now = new Date();

    // ドメインイベント生成
    const event: TaskUpdatedEvent = {
      id: uuidv4(),
      aggregateId: this.id,
      eventType: 'TaskUpdated',
      version: this._version + 1,
      timestamp: now,
      payload: {
        title: updates.title?.trim(),
        description: updates.description?.trim(),
        priority: updates.priority,
        updatedBy
      },
      metadata: {
        source: 'TaskAggregate.update',
        timestamp: now.toISOString()
      }
    };

    // イベントを発生
    this.raiseEvent(event);
  }

  /**
   * 集約の現在の状態をエンティティとして取得
   */
  toEntity(): TaskEntity {
    return {
      id: this.id,
      title: this._title,
      description: this._description,
      priority: this._priority,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      completedAt: this._completedAt,
      cancelledAt: this._cancelledAt
    };
  }

  /**
   * イベントを適用して状態を変更
   * 
   * @param event 適用するイベント
   */
  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'TaskCreated':
        this.applyTaskCreatedEvent(event as TaskCreatedEvent);
        break;
      case 'TaskCompleted':
        this.applyTaskCompletedEvent(event as TaskCompletedEvent);
        break;
      case 'TaskCancelled':
        this.applyTaskCancelledEvent(event as TaskCancelledEvent);
        break;
      case 'TaskUpdated':
        this.applyTaskUpdatedEvent(event as TaskUpdatedEvent);
        break;
      default:
        throw new Error(`Unknown event type: ${event.eventType}`);
    }
  }

  private applyTaskCreatedEvent(event: TaskCreatedEvent): void {
    this._title = event.payload.title;
    this._description = event.payload.description;
    this._priority = event.payload.priority;
    this._status = TaskStatus.PENDING;
    this._createdAt = event.timestamp;
    this._updatedAt = event.timestamp;
  }

  private applyTaskCompletedEvent(event: TaskCompletedEvent): void {
    this._status = TaskStatus.COMPLETED;
    this._completedAt = event.timestamp;
    this._updatedAt = event.timestamp;
  }

  private applyTaskCancelledEvent(event: TaskCancelledEvent): void {
    this._status = TaskStatus.CANCELLED;
    this._cancelledAt = event.timestamp;
    this._updatedAt = event.timestamp;
  }

  private applyTaskUpdatedEvent(event: TaskUpdatedEvent): void {
    if (event.payload.title !== undefined) {
      this._title = event.payload.title;
    }
    if (event.payload.description !== undefined) {
      this._description = event.payload.description;
    }
    if (event.payload.priority !== undefined) {
      this._priority = event.payload.priority;
    }
    this._updatedAt = event.timestamp;
  }
}