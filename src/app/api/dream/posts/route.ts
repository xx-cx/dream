import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取梦境列表
export async function GET() {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('dream_shares')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('查询失败:', error);
      return NextResponse.json(
        { error: '获取梦境列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ dreams: data });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 发布梦境
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dreamContent, authorName, dreamInterpretation } = body;

    if (!dreamContent) {
      return NextResponse.json(
        { error: '梦境内容不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('dream_shares')
      .insert({
        dream_content: dreamContent,
        author_name: authorName || '匿名梦友',
        dream_interpretation: dreamInterpretation || null,
      })
      .select()
      .single();

    if (error) {
      console.error('插入失败:', error);
      return NextResponse.json(
        { error: '发布失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, dream: data });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
