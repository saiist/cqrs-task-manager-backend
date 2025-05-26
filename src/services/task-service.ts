import { TaskRepository } from '@/infrastructure/task-repository';
import { EventBus } from '@/types/core';
import { TaskAggregate } from '@/domain/task-aggregate';
import { TaskPriority } from '@/types/task';
import { Logger } from '@/config/logger';
import { ValidationError } from '@/middleware/error-handler';

/**
 * タスクサービス
 * 
 * 責務:
 * - ユースケースの実装
 * - 集約とEvent Busの協調
 * - トランザクション境界の管理
 */
export class TaskService {
  constructor(
    private taskRepository: TaskRepository,
    private eventBus: EventBus
  ) {}

  /**
   * 新しいタスクを作成
   * 
   * @param data タスク作成データ
   * @returns 作成されたタスクID
   */
  async createTask(data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    createdBy?: string;
  }): Promise<string> {
    try {
      Logger.info('Creating new task', { data });

      // ドメインロジックを使用してタスク作成
      const task = TaskAggregate.createNew(
        data.title,
        data.description,
        data.priority || TaskPriority.MEDIUM,
        data.createdBy
      );

      console.log('After createNew:', {
        taskId: task.id,
        version: task.version,
        uncommittedEventsCount: task.getUncommittedEvents().length
      });

      // save()前にイベントを取得
      const uncommittedEvents = task.getUncommittedEvents();

      console.log('Before save:', {
        expectedVersion: task.version - uncommittedEvents.length,
        currentVersion: task.version,
        uncommittedEventsLength: uncommittedEvents.length
      });

      // 集約を保存
      await this.taskRepository.save(task);

      // イベントを発行（プロジェクション更新など）
      await this.eventBus.publish(uncommittedEvents);

      Logger.info('Task created successfully', {
        taskId: task.id,
        title: data.title,
        priority: data.priority,
        eventCount: uncommittedEvents.length
      });

      return task.id;

    } catch (error) {
      Logger.error('Failed to create task', {
        data,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * タスクを完了する
   * 
   * @param taskId タスクID
   * @param data 完了データ
   */
  async completeTask(taskId: string, data: {
    completedBy?: string;
    completionNote?: string;
  }): Promise<void> {
    try {
      Logger.info('Completing task', { taskId, data });

      // タスク集約を取得
      const task = await this.taskRepository.getById(taskId);

      // ドメインロジックを使用して完了
      task.complete(data.completedBy, data.completionNote);

      // save()前にイベントを取得
      const uncommittedEvents = task.getUncommittedEvents();

      // 集約を保存
      await this.taskRepository.save(task);

      // イベントを発行
      await this.eventBus.publish(uncommittedEvents);

      Logger.info('Task completed successfully', {
        taskId,
        completedBy: data.completedBy,
        eventCount: uncommittedEvents.length
      });

    } catch (error) {
      Logger.error('Failed to complete task', {
        taskId,
        data,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * タスクをキャンセルする
   * 
   * @param taskId タスクID
   * @param data キャンセルデータ
   */
  async cancelTask(taskId: string, data: {
    reason?: string;
    cancelledBy?: string;
  }): Promise<void> {
    try {
      Logger.info('Cancelling task', { taskId, data });

      // タスク集約を取得
      const task = await this.taskRepository.getById(taskId);

      // ドメインロジックを使用してキャンセル
      task.cancel(data.reason, data.cancelledBy);

      // save()前にイベントを取得
      const uncommittedEvents = task.getUncommittedEvents();

      // 集約を保存
      await this.taskRepository.save(task);

      // イベントを発行
      await this.eventBus.publish(uncommittedEvents);

      Logger.info('Task cancelled successfully', {
        taskId,
        reason: data.reason,
        cancelledBy: data.cancelledBy,
        eventCount: uncommittedEvents.length
      });

    } catch (error) {
      Logger.error('Failed to cancel task', {
        taskId,
        data,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * タスクを更新する
   * 
   * @param taskId タスクID
   * @param updates 更新データ
   * @param updatedBy 更新者
   */
  async updateTask(
    taskId: string, 
    updates: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
    },
    updatedBy?: string
  ): Promise<void> {
    try {
      Logger.info('Updating task', { taskId, updates, updatedBy });

      // タスク集約を取得
      const task = await this.taskRepository.getById(taskId);

      // ドメインロジックを使用して更新
      task.update(updates, updatedBy);

      // save()前にイベントを取得
      const uncommittedEvents = task.getUncommittedEvents();

      if (uncommittedEvents.length > 0) {
        // 集約を保存（変更がある場合のみ）
        await this.taskRepository.save(task);
        
        // イベントを発行
        await this.eventBus.publish(uncommittedEvents);
      }

      Logger.info('Task updated successfully', {
        taskId,
        hasChanges: uncommittedEvents.length > 0,
        eventCount: uncommittedEvents.length
      });

    } catch (error) {
      Logger.error('Failed to update task', {
        taskId,
        updates,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * タスクが存在するかチェック
   * 
   * @param taskId タスクID
   * @returns 存在する場合true
   */
  async taskExists(taskId: string): Promise<boolean> {
    try {
      return await this.taskRepository.exists(taskId);
    } catch (error) {
      Logger.error('Failed to check task existence', {
        taskId,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }
}