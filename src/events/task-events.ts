
import { DomainEvent } from '@/types/core';
import { TaskPriority } from '@/types/task';

/**
 * タスク作成イベント
 */
export interface TaskCreatedEvent extends DomainEvent {
  readonly eventType: 'TaskCreated';
  readonly payload: {
    readonly title: string;
    readonly description?: string;
    readonly priority: TaskPriority;
    readonly createdBy?: string;
  };
}

/**
 * タスク完了イベント
 */
export interface TaskCompletedEvent extends DomainEvent {
  readonly eventType: 'TaskCompleted';
  readonly payload: {
    readonly completedBy?: string;
    readonly completionNote?: string;
  };
}

/**
 * タスクキャンセルイベント
 */
export interface TaskCancelledEvent extends DomainEvent {
  readonly eventType: 'TaskCancelled';
  readonly payload: {
    readonly reason?: string;
    readonly cancelledBy?: string;
  };
}

/**
 * タスク更新イベント
 */
export interface TaskUpdatedEvent extends DomainEvent {
  readonly eventType: 'TaskUpdated';
  readonly payload: {
    readonly title?: string;
    readonly description?: string;
    readonly priority?: TaskPriority;
    readonly updatedBy?: string;
  };
}

/**
 * すべてのタスクイベントのユニオン型
 */
export type TaskEvent = 
  | TaskCreatedEvent 
  | TaskCompletedEvent 
  | TaskCancelledEvent 
  | TaskUpdatedEvent;
  