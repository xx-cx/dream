import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dreamId = parseInt(id);

    if (isNaN(dreamId)) {
      return NextResponse.json(
        { error: '无效的梦境 ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 先获取当前点赞数
    const { data: dream, error: fetchError } = await client
      .from('dream_shares')
      .select('likes_count')
      .eq('id', dreamId)
      .single();

    if (fetchError || !dream) {
      return NextResponse.json(
        { error: '梦境不存在' },
        { status: 404 }
      );
    }

    // 更新点赞数
    const { error: updateError } = await client
      .from('dream_shares')
      .update({ likes_count: dream.likes_count + 1 })
      .eq('id', dreamId);

    if (updateError) {
      console.error('更新失败:', updateError);
      return NextResponse.json(
        { error: '点赞失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
