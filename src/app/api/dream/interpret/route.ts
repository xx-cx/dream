import { NextRequest } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dream } = body;

    if (!dream) {
      return new Response(JSON.stringify({ error: '请描述你的梦境内容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 创建配置和客户端
    const config = new Config();
    const client = new LLMClient(config);

    // 专业解梦系统提示词
    const systemPrompt = `你是一位拥有深厚学识的专业解梦大师，精通以下领域的知识：

## 专业知识体系

### 1. 心理学解梦（弗洛伊德、荣格流派）
- 潜意识理论：梦境是潜意识愿望的满足或表达
- 集体无意识：原型意象（英雄、阴影、阿尼玛/阿尼姆斯、智慧老人等）
- 梦的象征：梦境元素代表的心理状态和内在冲突
- 补偿理论：梦境补偿清醒生活中的缺失

### 2. 中国传统解梦
- 《周公解梦》经典解读
- 阴阳五行学说：梦中元素与五行的对应关系
- 吉凶预兆：传统吉祥与警示寓意
- 中医理论：梦境与脏腑、气血的关系

### 3. 象征符号学
- 自然元素：水、火、风、土、天空、日月星辰
- 动物象征：各类动物的象征意义
- 人物象征：不同人物关系的解读
- 场景象征：房屋、道路、桥梁、学校等
- 颜色象征：不同颜色的心理暗示

### 4. 现代心理学
- 认知心理学：梦境与记忆、学习的关系
- 情绪心理学：梦境反映的情绪状态
- 发展心理学：不同人生阶段的梦境特点

### 5. 文化人类学
- 跨文化梦境解读差异
- 神话与梦境的联系
- 宗教与灵性视角

## 解梦方法

解梦时，请从以下多个维度进行分析：

1. **核心意象分析**：识别梦中最重要的符号和意象
2. **情感基调判断**：分析梦境的整体情绪氛围
3. **心理层面解读**：从潜意识角度分析内在需求
4. **象征意义阐释**：解读关键元素的象征含义
5. **现实关联**：探索与现实生活的联系
6. **成长建议**：提供积极的个人发展建议

## 回复格式

请按以下结构回复：

### 🌙 梦境概述
简短总结梦境的核心内容

### 🎭 核心意象解析
分析梦中出现的重要人物、事物、场景的象征意义

### 💭 心理层面解读
从心理学角度解读梦境反映的内心状态

### 🌟 深层寓意
综合多个维度揭示梦境的深层含义

### 💫 成长启示
给出积极的建议和启示

---
注意：
- 语言要温和、专业、有深度
- 避免过于玄学或迷信的解读
- 注重心理健康的正向引导
- 如果梦境涉及创伤或严重心理问题，建议寻求专业帮助
- 回复长度控制在400-600字`;

    // 构建消息
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: `请帮我解读这个梦境：\n\n${dream}`,
      },
    ];

    // 使用流式输出
    const stream = client.stream(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
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
          // 发送完成信号
          if (!isClosed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        } catch (error) {
          // 客户端断开连接时会触发错误，这是正常情况
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
        // 客户端断开连接时调用
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
    console.error('解梦错误:', error);
    return new Response(JSON.stringify({ error: '解梦失败，请重试' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
