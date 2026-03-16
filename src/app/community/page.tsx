'use client';

import { useState, useEffect } from 'react';
import { Heart, Share2, Clock, User, Sparkles, Send, Moon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DreamPost {
  id: number;
  dream_content: string;
  dream_interpretation: string | null;
  author_name: string;
  likes_count: number;
  created_at: string;
}

export default function CommunityPage() {
  const [dreams, setDreams] = useState<DreamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 发布梦境相关
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDream, setNewDream] = useState('');
  const [authorName, setAuthorName] = useState('匿名梦友');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);

  // 获取梦境列表
  const fetchDreams = async () => {
    try {
      const response = await fetch('/api/dream/posts');
      if (!response.ok) throw new Error('获取失败');
      
      const data = await response.json();
      setDreams(data.dreams || []);
    } catch (err) {
      setError('加载梦境失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDreams();
  }, []);

  // 发布梦境
  const handleSubmitDream = async () => {
    if (!newDream.trim()) {
      setError('请输入梦境内容');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 生成专业解梦
      setIsInterpreting(true);
      const interpretResponse = await fetch('/api/dream/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream: newDream }),
      });

      let interpretation = '';
      if (interpretResponse.ok) {
        const reader = interpretResponse.body?.getReader();
        const decoder = new TextDecoder();
        
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
                  interpretation += json.content || '';
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        }
      }
      setIsInterpreting(false);

      // 保存到数据库
      const saveResponse = await fetch('/api/dream/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamContent: newDream,
          authorName: authorName || '匿名梦友',
          dreamInterpretation: interpretation,
        }),
      });

      if (!saveResponse.ok) throw new Error('发布失败');

      // 重置表单并刷新列表
      setNewDream('');
      setAuthorName('匿名梦友');
      setIsDialogOpen(false);
      await fetchDreams();
    } catch (err) {
      setError('发布梦境失败，请重试');
    } finally {
      setIsSubmitting(false);
      setIsInterpreting(false);
    }
  };

  // 点赞
  const handleLike = async (dreamId: number) => {
    try {
      await fetch(`/api/dream/posts/${dreamId}/like`, {
        method: 'POST',
      });
      
      // 更新本地状态
      setDreams(dreams.map(dream => 
        dream.id === dreamId 
          ? { ...dream, likes_count: dream.likes_count + 1 }
          : dream
      ));
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 导航栏 */}
        <div className="flex justify-start">
          <Link href="/">
            <Button 
              variant="outline" 
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            >
              <Moon className="h-4 w-4 mr-2" />
              返回解梦
            </Button>
          </Link>
        </div>
        
        {/* 头部 */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="h-10 w-10 text-indigo-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              梦境社区
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            分享你的梦境，探索他人梦境世界的奥秘
          </p>
        </div>

        {/* 发布按钮 */}
        <div className="flex justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105 transition-all"
              >
                <Share2 className="h-5 w-5 mr-2" />
                分享我的梦境
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-indigo-500/20 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  分享你的梦境
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  记录你的梦境，AI 会为你生成专业的解梦分析
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">你的昵称</label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="匿名梦友"
                    className="bg-slate-800 border-slate-700 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">梦境内容</label>
                  <Textarea
                    value={newDream}
                    onChange={(e) => setNewDream(e.target.value)}
                    placeholder="详细描述你的梦境，包括场景、人物、情节和感受..."
                    rows={6}
                    className="bg-slate-800 border-slate-700 focus:border-indigo-500 resize-none"
                  />
                </div>
                {error && (
                  <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-slate-700"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmitDream}
                    disabled={isSubmitting || !newDream.trim()}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {isSubmitting ? (
                      <>
                        {isInterpreting ? 'AI 解梦中...' : '发布中...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        发布梦境
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 错误提示 */}
        {error && !isDialogOpen && (
          <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 加载状态 */}
        {loading && (
          <Card className="bg-slate-900/50 border-indigo-500/20 backdrop-blur-sm">
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-indigo-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mr-3" />
                <span>正在加载梦境...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 梦境列表 */}
        <div className="space-y-4">
          {dreams.map((dream) => (
            <Card 
              key={dream.id} 
              className="bg-slate-900/50 border-indigo-500/20 backdrop-blur-sm hover:border-indigo-500/40 transition-colors"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{dream.author_name}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatTime(dream.created_at)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(dream.id)}
                    className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    {dream.likes_count}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2 flex items-center gap-1">
                    <Moon className="h-4 w-4" />
                    梦境描述
                  </p>
                  <p className="text-white leading-relaxed">{dream.dream_content}</p>
                </div>
                {dream.dream_interpretation && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-indigo-500/10">
                    <p className="text-sm text-indigo-400 mb-2 flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      专业解梦
                    </p>
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {dream.dream_interpretation}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {dreams.length === 0 && !loading && (
            <Card className="bg-slate-900/50 border-indigo-500/20 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
                <p className="text-slate-400">还没有人分享梦境</p>
                <p className="text-slate-500 text-sm mt-2">成为第一个分享梦境的人吧！</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
