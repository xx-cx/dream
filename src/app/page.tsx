'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, Moon, Sparkles, Users, Send, Keyboard, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DreamInterpretationPage() {
  // 输入方式
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  
  // 文字输入
  const [dreamText, setDreamText] = useState('');
  
  // 语音输入
  const [isRecording, setIsRecording] = useState(false);
  
  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 开始录音
  const startRecording = async () => {
    try {
      setError('');
      audioChunksRef.current = [];
      setRecognizedText('');
      setInterpretation('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceInput(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('无法访问麦克风，请检查权限设置');
      console.error('麦克风访问错误:', err);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 处理语音输入
  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // 语音识别
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const transcribeResponse = await fetch('/api/dream/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error('语音识别失败');
      }

      const transcribeData = await transcribeResponse.json();
      setRecognizedText(transcribeData.text);
      
      // 解梦
      await interpretDream(transcribeData.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理过程中发生错误');
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理文字输入
  const handleTextSubmit = async () => {
    if (!dreamText.trim()) {
      setError('请输入你的梦境内容');
      return;
    }
    
    setError('');
    setRecognizedText(dreamText);
    await interpretDream(dreamText);
  };

  // 解梦（流式输出）
  const interpretDream = async (dream: string) => {
    setIsProcessing(true);
    setInterpretation('');
    
    try {
      const response = await fetch('/api/dream/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream }),
      });

      if (!response.ok) {
        throw new Error('解梦失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullInterpretation = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const json = JSON.parse(data);
                fullInterpretation += json.content || '';
                setInterpretation(fullInterpretation);
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解梦过程中发生错误');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 导航栏 */}
        <div className="flex justify-end">
          <Link href="/community">
            <Button 
              variant="outline" 
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            >
              <Users className="h-4 w-4 mr-2" />
              梦境社区
            </Button>
          </Link>
        </div>

        {/* 头部 */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <Moon className="h-12 w-12 text-indigo-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              专业解梦
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            输入你的梦境，从心理学、象征学、文化学等多维度专业解读梦境的深层含义
          </p>
        </div>

        {/* 输入区域 */}
        <Card className="bg-slate-900/50 border-indigo-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-400" />
              描述你的梦境
            </CardTitle>
            <CardDescription className="text-slate-400">
              选择文字输入或语音输入方式，详细描述你梦到的内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'text' | 'voice')} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                <TabsTrigger value="text" className="data-[state=active]:bg-indigo-600">
                  <Keyboard className="h-4 w-4 mr-2" />
                  文字输入
                </TabsTrigger>
                <TabsTrigger value="voice" className="data-[state=active]:bg-indigo-600">
                  <Volume2 className="h-4 w-4 mr-2" />
                  语音输入
                </TabsTrigger>
              </TabsList>

              {/* 文字输入 */}
              <TabsContent value="text" className="space-y-4">
                <Textarea
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="请详细描述你的梦境，包括：&#10;• 梦中的场景和人物&#10;• 发生的故事情节&#10;• 你的感受和情绪&#10;• 任何印象深刻的细节&#10;&#10;例如：我梦见自己在一片开满鲜花的草地上奔跑，天空是紫色的，远处有一座发光的城堡..."
                  rows={8}
                  className="bg-slate-800/50 border-slate-700 focus:border-indigo-500 resize-none text-slate-200 placeholder:text-slate-500"
                />
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleTextSubmit}
                    disabled={isProcessing || !dreamText.trim()}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        解读中...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        开始解梦
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* 语音输入 */}
              <TabsContent value="voice" className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Button
                    size="lg"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`
                      rounded-full h-28 w-28 text-3xl transition-all duration-300
                      ${isRecording 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/50' 
                        : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105 shadow-lg shadow-indigo-500/30'
                      }
                    `}
                  >
                    {isRecording ? (
                      <MicOff className="h-12 w-12" />
                    ) : (
                      <Mic className="h-12 w-12" />
                    )}
                  </Button>
                  
                  <p className="mt-6 text-slate-400 text-center">
                    {isRecording ? (
                      <span className="flex items-center gap-2 text-red-400">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        正在录音，请描述你的梦境...
                      </span>
                    ) : (
                      '点击麦克风按钮开始录音'
                    )}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert className="mt-4 bg-red-500/10 border-red-500/20 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 识别的梦境内容 */}
        {recognizedText && !isProcessing && (
          <Card className="bg-slate-900/50 border-indigo-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-400" />
                你的梦境
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-200 leading-relaxed">{recognizedText}</p>
            </CardContent>
          </Card>
        )}

        {/* 处理中状态 */}
        {isProcessing && (
          <Card className="bg-slate-900/50 border-indigo-500/20 backdrop-blur-sm">
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-3 text-indigo-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg font-medium">正在从多个维度分析你的梦境...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 解梦结果 */}
        {interpretation && (
          <Card className="bg-slate-900/50 border-indigo-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-indigo-400" />
                梦境解读
              </CardTitle>
              <CardDescription>
                从心理学、象征学、文化学角度的专业分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <div className="text-slate-200 leading-relaxed whitespace-pre-wrap space-y-4">
                  {interpretation}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 底部提示 */}
        <div className="text-center text-slate-500 text-sm py-4">
          <p>💡 提示：梦境描述越详细，解读越准确</p>
        </div>
      </div>
    </div>
  );
}
