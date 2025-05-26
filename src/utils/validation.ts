
import { ValidationError } from '@/middleware/error-handler';

/**
 * バリデーションヘルパー
 */
export class Validator {
  /**
   * 必須チェック
   */
  static required(value: any, fieldName: string): void {
    if (value === null || value === undefined || 
        (typeof value === 'string' && value.trim().length === 0)) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
  }

  /**
   * 文字列長チェック
   */
  static maxLength(value: string | undefined, maxLength: number, fieldName: string): void {
    if (value && value.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must be less than ${maxLength} characters`,
        fieldName
      );
    }
  }

  /**
   * 最小文字列長チェック
   */
  static minLength(value: string | undefined, minLength: number, fieldName: string): void {
    if (value && value.length < minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} characters`,
        fieldName
      );
    }
  }

  /**
   * UUIDフォーマットチェック
   */
  static isUUID(value: string, fieldName: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid UUID`, fieldName);
    }
  }

  /**
   * Enumチェック
   */
  static isEnum<T>(value: any, enumObject: T, fieldName: string): void {
    const validValues = Object.values(enumObject as any);
    if (!validValues.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${validValues.join(', ')}`,
        fieldName
      );
    }
  }
}