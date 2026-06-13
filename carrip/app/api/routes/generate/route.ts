import { NextRequest, NextResponse } from 'next/server';
import { generateRouteRequestSchema } from '@/types/schemas';
import { ZodError } from 'zod';

interface ValidationError {
  code: string;
  message: string;
  details: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * バリデーションエラーをDR-INPエラーコードにマッピング
 */
function mapValidationErrorToCode(field: string, index: number): string {
  const fieldToCodeMap: Record<string, string> = {
    departureLocation: 'DR-INP-001',
    prefectures: 'DR-INP-002', // デフォルト
    departureDate: 'DR-INP-004',
    tripDays: 'DR-INP-006',
    numberOfPeople: 'DR-INP-005',
    'carType.fuelEfficiency': 'DR-INP-007',
  };

  // prefectures の場合は最大件数チェック
  if (field === 'prefectures') {
    return 'DR-INP-003';
  }

  return fieldToCodeMap[field] || 'DR-INP-002';
}

/**
 * Zodのエラーをアプリケーション形式に変換
 */
function formatZodError(zodError: ZodError): ValidationError {
  const issues = zodError.issues;

  // 最初のエラーのメッセージをメイン メッセージとして使用
  const firstIssue = issues[0];
  const code = mapValidationErrorToCode(
    firstIssue.path.join('.'),
    0
  );

  const details = issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    code,
    message: firstIssue.message,
    details,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // リクエストボディの検証
    const validatedData = generateRouteRequestSchema.parse(body);

    // TODO: 実際のルート生成ロジックはここに実装される
    // このエンドポイントは、バリデーションが通った場合、
    // 外部APIを呼び出してルート候補を生成します。
    // 現時点では、バリデーションのみを実装しています。

    // 暫定的にバリデーション成功を返す
    return NextResponse.json(
      {
        success: true,
        message: 'バリデーション成功',
        data: validatedData,
      },
      { status: 200 }
    );
  } catch (error) {
    // Zodバリデーションエラーの処理
    if (error instanceof ZodError) {
      const validationError = formatZodError(error);
      return NextResponse.json(
        {
          error: validationError,
        },
        { status: 400 }
      );
    }

    // JSON パースエラーの処理
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: {
            code: 'DR-SYS-002',
            message: '予期せぬエラーが発生しました。しばらく後にお試しください。',
            details: [
              {
                field: 'body',
                message: 'リクエストボディが不正なJSON形式です。',
              },
            ],
          },
        },
        { status: 400 }
      );
    }

    // その他の予期しないエラー
    return NextResponse.json(
      {
        error: {
          code: 'DR-SYS-002',
          message: '予期せぬエラーが発生しました。しばらく後にお試しください。',
          details: [],
        },
      },
      { status: 500 }
    );
  }
}
