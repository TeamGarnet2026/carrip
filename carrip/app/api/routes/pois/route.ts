import { NextRequest, NextResponse } from 'next/server';
import { poiRequestSchema } from '@/types/schemas';
import { getPOIsByRegionAndPriority } from '@/utils/poi/poiService';
import { ZodError } from 'zod';

export const runtime = 'edge'

interface ValidationError {
  code: string;
  message: string;
  details: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Zodのエラーをアプリケーション形式に変換
 */
function formatZodError(zodError: ZodError): ValidationError {
  const issues = zodError.issues;
  const firstIssue = issues[0];

  const details = issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    code: 'POI-INP-001',
    message: firstIssue.message,
    details,
  };
}

/**
 * POST /api/routes/pois
 * 訪問エリア内のPOI候補を取得
 * リクエスト: { prefectures: string[], priority?: 'tourist_spot' | 'restaurant' | 'attraction' }
 * レスポンス: { pois: POILocation[], count: number, fromCache: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // リクエストボディの検証
    const validatedData = poiRequestSchema.parse(body);

    // POIサービスを呼び出し
    const result = await getPOIsByRegionAndPriority(
      validatedData.prefectures,
      validatedData.priority
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
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
            code: 'POI-SYS-001',
            message: 'リクエストボディが不正なJSON形式です。',
            details: [],
          },
        },
        { status: 400 }
      );
    }

    // その他のエラー
    console.error('POI取得エラー:', error);
    return NextResponse.json(
      {
        error: {
          code: 'POI-SYS-002',
          message: 'POI取得中にエラーが発生しました。',
          details: [],
        },
      },
      { status: 500 }
    );
  }
}
