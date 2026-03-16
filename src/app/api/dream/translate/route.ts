import { NextRequest } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: '缺少文本内容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 创建配置和客户端
    const config = new Config();
    const client = new LLMClient(config);

    // 构建消息
    const messages = [
      {
        role: 'system' as const,
        content: `你是一位专业的梦话解读专家。你的任务是分析用户说出的梦话，并提供温馨、有趣的解读。

你的回复应该包含：
1. 梦话的情感基调（开心、焦虑、平静等）
2. 可能的潜意识含义
3. 温馨的鼓励或建议

请用温柔、富有同理心的语气，用中文回复。保持回复在 200-300 字左右。`,
      },
      {
        role: 'user' as const,
        content: `我的梦话是："${text}"，请帮我解读一下。`,
      },
    ];

    // 使用流式输出
    const stream = client.stream(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.8,
    });

    // 创建 SSE 响应
    const encoder = new TextEncoder();
    let isClosed = false;
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (isClosed) break;
            if (chunk.content) {
              const content = chunk.content.toString();
              const data = JSON.stringify({ content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          if (!isClosed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        } catch (error) {
          if (!isClosed) {
            console.error('流式输出错误:', error);
            try {
              controller.error(error);
            } catch (e) {
              // controller 可能已经关闭，忽略错误
            }
          }
        }
      },
      cancel() {
        isClosed = true;
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('梦话翻译错误:', error);
    return new Response(JSON.stringify({ error: '梦话翻译失败，请重试' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
