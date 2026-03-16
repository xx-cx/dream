import { NextRequest, NextResponse } from 'next/server';
import { ASRClient, Config } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: '缺少音频文件' },
        { status: 400 }
      );
    }

    // 将音频文件转换为 base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 创建配置和客户端
    const config = new Config();
    const client = new ASRClient(config);

    // 调用语音识别
    const result = await client.recognize({
      uid: 'dream-user-' + Date.now(),
      base64Data: base64Data,
    });

    return NextResponse.json({
      text: result.text,
      duration: result.duration,
    });
  } catch (error) {
    console.error('语音识别错误:', error);
    return NextResponse.json(
      { error: '语音识别失败，请重试' },
      { status: 500 }
    );
  }
}
