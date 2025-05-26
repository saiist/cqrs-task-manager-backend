
/**
 * タスクの優先度
 */
export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
  }
  
  /**
   * タスクの状態
   */
  export enum TaskStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
  }
  
  /**
   * タスクエンティティ（Write Model用）
   */
  export interface TaskEntity {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly priority: TaskPriority;
    readonly status: TaskStatus;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly completedAt?: Date;
    readonly cancelledAt?: Date;
  }
  
  /**
   * タスクビューモデル（Read Model用）
   */
  export interface TaskViewModel {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly priority: TaskPriority;
    readonly priorityLabel: string;
    readonly status: TaskStatus;
    readonly statusLabel: string;
    readonly createdAt: string;     // ISO文字列
    readonly updatedAt: string;     // ISO文字列
    readonly completedAt?: string;  // ISO文字列
    readonly cancelledAt?: string;  // ISO文字列
    readonly daysFromCreation: number;
  }
  
  /**
   * タスク統計情報
   */
  export interface TaskStatistics {
    readonly total: number;
    readonly pending: number;
    readonly completed: number;
    readonly cancelled: number;
    readonly completionRate: number;
    readonly priorityBreakdown: {
      readonly [key in TaskPriority]: number;
    };
  }