'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { loadModel, classifyCanvas } from '../lib/models/imageClassifier';
import { saveRecord } from '../lib/stats';
import ModeSwitcher, { OperationMode } from './components/ModeSwitcher';
import SettingsModal from './components/SettingsModal';

interface ApiConfig {
  apiKey: string;
  modelName: string;
  apiUrl: string;
}

interface OllamaConfig {
  apiUrl: string;
  modelName: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [guess, setGuess] = useState<string>('');
  const [ollaGuess, setOllaGuess] = useState<string>('');
  const [apiGuess, setApiGuess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [aiEvaluation, setAiEvaluation] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [isEraserMode, setIsEraserMode] = useState<boolean>(false);
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [operationMode, setOperationMode] = useState<OperationMode>('api');
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apiKey: '',
    modelName: 'gemini-1.5-flash',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
  });
  const [ollaConfig, setOllaConfig] = useState<OllamaConfig>({
    apiUrl: 'http://localhost:11434',
    modelName: 'llama3'
  });
  const getContext2D = useCallback((canvas: HTMLCanvasElement) => {
    return canvas.getContext('2d', { willReadFrequently: true });
  }, []);
  const proxyFetch = useCallback(async (
    targetUrl: string,
    headers: Record<string, string>,
    body: unknown,
    signal?: AbortSignal
  ) => {
    return fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, headers, body }),
      signal,
    });
  }, []);

  // 随机题目题库（按类别组织）
  const topicBank = useMemo(() => ([
    { category: '水果', items: ['苹果', '香蕉', '橙子', '草莓', '西瓜', '葡萄', '菠萝', '芒果'] },
    { category: '动物', items: ['猫', '狗', '兔子', '熊猫', '老虎', '狮子', '大象', '长颈鹿'] },
    { category: '交通工具', items: ['汽车', '飞机', '火车', '自行车', '轮船', '地铁', '摩托车', '直升机'] },
    { category: '日常物品', items: ['书', '笔', '电脑', '手机', '杯子', '眼镜', '钥匙', '钟表'] },
    { category: '服饰用品', items: ['帽子', '鞋子', '衣服', '书包', '围巾', '手套', '雨伞', '口罩'] },
    { category: '食物', items: ['蛋糕', '冰淇淋', '汉堡', '披萨', '面条', '饺子', '寿司', '炸鸡'] },
    { category: '运动', items: ['足球', '篮球', '乒乓球', '羽毛球', '网球', '排球', '游泳', '滑板'] },
    { category: '自然天象', items: ['太阳', '月亮', '星星', '彩虹', '云朵', '雪花', '山', '海洋'] },
    { category: '建筑场景', items: ['房子', '学校', '医院', '公园', '商店', '桥', '城堡', '灯塔'] }
  ]), []);
  const topics = useMemo(
    () => topicBank.flatMap((group) => group.items),
    [topicBank]
  );

  // 加载响应式辅助脚本
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/responsive-helper.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 加载保存的配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('geminiApiConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setApiConfig(config);
      } catch (e) {
        console.error('Failed to load saved config:', e);
      }
    }
    
    // 加载保存的Olla配置
    const savedOllaConfig = localStorage.getItem('ollamaConfig');
    if (savedOllaConfig) {
      try {
        const config = JSON.parse(savedOllaConfig);
        setOllaConfig(config);
      } catch (e) {
        console.error('Failed to load saved Olla config:', e);
      }
    }
    
    // 加载保存的操作模式
    const savedMode = localStorage.getItem('operationMode') as OperationMode;
    if (savedMode && ['ollama', 'api', 'simultaneous'].includes(savedMode)) {
      setOperationMode(savedMode);
    }
  }, []);

  // 保存操作模式
  useEffect(() => {
    localStorage.setItem('operationMode', operationMode);
  }, [operationMode]);

  // 更新画布上下文设置（只更新画笔属性，不清除画布）
  const updateCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getContext2D(canvas);
    if (!ctx) return;

    if (isEraserMode) {
      // 橡皮擦模式：使用 destination-out 合成模式来擦除
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      // 画笔模式：正常绘制
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [brushColor, brushSize, getContext2D, isEraserMode]);

  // 初始化画布（只在组件首次挂载时执行一次）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 设置画布实际尺寸为容器尺寸
    const resizeCanvas = () => {
      const wrapper = canvas.parentElement;
      if (!wrapper) return;
      
      // 获取容器的实际尺寸
      const rect = wrapper.getBoundingClientRect();
      // 设置画布的实际像素尺寸
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const ctx = getContext2D(canvas);
      if (!ctx) return;

      // 设置画布样式（只在首次初始化时清除）
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      updateCanvasContext();
      
      // 保存初始状态
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasHistory([imageData]);
      setHistoryIndex(0);
    };
    
    // 初始调整大小
    resizeCanvas();
    
    // 监听窗口大小变化
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 当画笔颜色或大小改变时，只更新上下文设置，不清除画布
  useEffect(() => {
    updateCanvasContext();
  }, [updateCanvasContext]);

  // 保存画布状态到历史记录
  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getContext2D(canvas);
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [getContext2D, historyIndex]);

  // 撤销上一笔
  const undoLastStroke = useCallback(() => {
    if (historyIndex <= 0) {
      // 如果没有历史记录，清除画布
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = getContext2D(canvas);
      if (!ctx) return;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setCanvasHistory([]);
      setHistoryIndex(-1);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getContext2D(canvas);
    if (!ctx) return;

    // 恢复到上一个状态
    const newIndex = historyIndex - 1;
    const previousState = canvasHistory[newIndex];
    
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [canvasHistory, getContext2D, historyIndex]);

  // 清除画布
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getContext2D(canvas);
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 重置历史记录
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory([imageData]);
    setHistoryIndex(0);
  }, [getContext2D]);

  // 获取随机题目
  const getRandomTopic = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * topics.length);
    return topics[randomIndex];
  }, [topics]);

  // 生成新题目
  const generateNewTopic = useCallback(() => {
    const newTopic = getRandomTopic();
    setCurrentTopic(newTopic);
    
    // 重置猜测结果
    setGuess('');
    setOllaGuess('');
    setApiGuess('');
    setError('');
  }, [getRandomTopic]);

  // 获取鼠标/触摸位置
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  // 开始绘制
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getContext2D(canvas);
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setIsDrawing(true);
    
    // 阻止触摸设备的默认行为（如滚动）
    if ('touches' in e) {
      e.preventDefault();
    }
  };

  // 绘制
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getContext2D(canvas);
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 阻止触摸设备的默认行为（如滚动）
    if ('touches' in e) {
      e.preventDefault();
    }
  };

  // 停止绘制
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCanvasState();
    }
  };

  // 使用Ollama模型分类
  const classifyWithOlla = useCallback(async (canvas: HTMLCanvasElement) => {
    // 将画布内容转换为base64
    const base64Image = canvas.toDataURL('image/png').split(',')[1];
    
    // 构建请求URL
    const apiUrl = `${ollaConfig.apiUrl}/api/generate`;
    
    // 构建请求体
    const requestBody = {
      model: ollaConfig.modelName,
      prompt: "请识别这张图片中的内容，只回答一个词或短语，不要有多余的解释。",
      images: [base64Image],
      stream: false
    };
    
    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
      const response = await proxyFetch(
        apiUrl,
        { 'Content-Type': 'application/json' },
        requestBody,
        controller.signal
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Olla API请求失败: ${errorData.error || '未知错误'}`);
      }
      
      const data = await response.json();
      return data.response || '无法识别';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }, [ollaConfig, proxyFetch]);

  // 使用API模型分类
  const classifyWithAPI = useCallback(async (canvas: HTMLCanvasElement) => {
    // 将画布内容转换为base64
    const base64Image = canvas.toDataURL('image/png').split(',')[1];
    
    // 检查API格式
    const isOllaFormat = apiConfig.apiUrl.includes('/api/generate');
    const isOpenAIFormat = apiConfig.apiUrl.includes('/chat/completions') || 
                          apiConfig.apiUrl.includes('/v1/chat/completions');
    
    let apiUrl = apiConfig.apiUrl;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let requestBody: any;
    
    if (isOllaFormat) {
      // Ollama格式
      apiUrl = `${apiConfig.apiUrl}/api/generate`;
      requestBody = {
        model: apiConfig.modelName,
        prompt: "请识别这张图片中的内容，只回答一个词或短语，不要有多余的解释。",
        images: [base64Image],
        stream: false
      };
    } else if (isOpenAIFormat) {
      // OpenAI兼容格式
      if (!apiConfig.apiKey) {
        throw new Error('使用OpenAI兼容API需要提供API Key');
      }
      
      headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
      
      // 确保URL包含完整的路径
      if (!apiUrl.includes('/chat/completions')) {
        apiUrl = apiUrl.endsWith('/') ? `${apiUrl}chat/completions` : `${apiUrl}/chat/completions`;
      }
      
      requestBody = {
        model: apiConfig.modelName,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请识别这张图片中的内容，只回答一个词或短语，不要有多余的解释。"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0.4
      };
    } else {
      // Gemini格式
      if (!apiConfig.apiKey) {
        throw new Error('使用Gemini API需要提供API Key');
      }
      
      // 确保URL包含完整的路径
      if (!apiUrl.includes(':generateContent')) {
        apiUrl = apiUrl.endsWith('/') ? `${apiUrl}${apiConfig.modelName}:generateContent` : `${apiUrl}/${apiConfig.modelName}:generateContent`;
      }
      
      headers['x-goog-api-key'] = apiConfig.apiKey;
      
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: "请识别这张图片中的内容，只回答一个词或短语，不要有多余的解释。"
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        }
      };
    }
    
    // 调用API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    const response = await proxyFetch(apiUrl, headers, requestBody, controller.signal);
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const errorMsg = typeof errorData === 'string' 
        ? errorData 
        : errorData?.error?.message || errorData?.message || JSON.stringify(errorData);
      throw new Error(`API请求失败: ${errorMsg}`);
    }
    
    const data = await response.json();
    
    // 提取AI的猜测（根据不同的API格式）
    let guess: string;
    if (isOllaFormat) {
      // Ollama格式：data.response
      guess = data.response || '无法识别';
    } else if (isOpenAIFormat) {
      // OpenAI格式：data.choices[0].message.content
      guess = data.choices?.[0]?.message?.content || '无法识别';
    } else {
      // Gemini格式：data.candidates[0].content.parts[0].text
      guess = data.candidates?.[0]?.content?.parts?.[0]?.text || '无法识别';
    }
    
    return guess;
  }, [apiConfig, proxyFetch]);

  // 使用Ollama模型评价（流式传输）
  const evaluateWithOlla = useCallback(async (canvas: HTMLCanvasElement, onChunk: (chunk: string) => void) => {
    const base64Image = canvas.toDataURL('image/png').split(',')[1];
    const apiUrl = `${ollaConfig.apiUrl}/api/generate`;
    const requestBody = {
      model: ollaConfig.modelName,
      prompt: "请评价这张画作的质量，给出1-10分的评分，并提供具体的改进建议。请用简洁明了的语言回答。",
      images: [base64Image],
      stream: true
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await proxyFetch(
        apiUrl,
        { 'Content-Type': 'application/json' },
        requestBody,
        controller.signal
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Olla API请求失败: ${errorData.error || '未知错误'}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                fullText += data.response;
                onChunk(data.response);
              }
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      }
      
      return fullText;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }, [ollaConfig, proxyFetch]);

  // 使用API模型评价（流式传输）
  const evaluateWithAPI = useCallback(async (canvas: HTMLCanvasElement, onChunk: (chunk: string) => void) => {
    const base64Image = canvas.toDataURL('image/png').split(',')[1];
    const isOllaFormat = apiConfig.apiUrl.includes('/api/generate');
    const isOpenAIFormat = apiConfig.apiUrl.includes('/chat/completions') || 
                          apiConfig.apiUrl.includes('/v1/chat/completions');
    
    let apiUrl = apiConfig.apiUrl;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let requestBody: any;
    
    if (isOllaFormat) {
      apiUrl = `${apiConfig.apiUrl}/api/generate`;
      requestBody = {
        model: apiConfig.modelName,
        prompt: "请评价这张画作的质量，给出1-10分的评分，并提供具体的改进建议。请用简洁明了的语言回答。",
        images: [base64Image],
        stream: true
      };
    } else if (isOpenAIFormat) {
      if (!apiConfig.apiKey) {
        throw new Error('使用OpenAI兼容API需要提供API Key');
      }
      
      headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
      
      if (!apiUrl.includes('/chat/completions')) {
        apiUrl = apiUrl.endsWith('/') ? `${apiUrl}chat/completions` : `${apiUrl}/chat/completions`;
      }
      
      requestBody = {
        model: apiConfig.modelName,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请评价这张画作的质量，给出1-10分的评分，并提供具体的改进建议。请用简洁明了的语言回答。"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.5,
        stream: true
      };
    } else {
      if (!apiConfig.apiKey) {
        throw new Error('使用Gemini API需要提供API Key');
      }
      
      if (!apiUrl.includes(':generateContent')) {
        apiUrl = apiUrl.endsWith('/') ? `${apiUrl}${apiConfig.modelName}:generateContent` : `${apiUrl}/${apiConfig.modelName}:generateContent`;
      }
      
      headers['x-goog-api-key'] = apiConfig.apiKey;
      
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: "请评价这张画作的质量，给出1-10分的评分，并提供具体的改进建议。请用简洁明了的语言回答。"
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.5,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1000,
        }
      };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await proxyFetch(apiUrl, headers, requestBody, controller.signal);
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const errorMsg = typeof errorData === 'string' 
        ? errorData 
        : errorData?.error?.message || errorData?.message || JSON.stringify(errorData);
      throw new Error(`API请求失败: ${errorMsg}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }
    
    const decoder = new TextDecoder();
    let fullText = '';
    
    if (isOllaFormat) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                fullText += data.response;
                onChunk(data.response);
              }
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      }
    } else if (isOpenAIFormat) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      }
    } else {
      const data = await response.json();
      fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '无法评价';
      onChunk(fullText);
    }
    
    return fullText;
  }, [apiConfig, proxyFetch]);

  // 提交画作让AI猜测
  const submitDrawing = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);
    setIsEvaluating(true);
    setError('');
    setGuess('');
    setOllaGuess('');
    setApiGuess('');
    setAiEvaluation('');

    try {
      if (operationMode === 'ollama') {
        // 仅使用Ollama模型
        const [result] = await Promise.allSettled([
          classifyWithOlla(canvas)
        ]);
        
        if (result.status === 'fulfilled') {
          setOllaGuess(result.value);
          setGuess(result.value);
        } else {
          setOllaGuess(`Ollama模型失败: ${result.reason}`);
          setGuess(`Ollama模型失败: ${result.reason}`);
        }
        
        // 流式评价
        try {
          await evaluateWithOlla(canvas, (chunk) => {
            setAiEvaluation(prev => prev + chunk);
          });
        } catch (e) {
          setAiEvaluation('评价失败');
        }
        
        // 保存统计记录
        try {
          saveRecord({
            timestamp: Date.now(),
            durationMs: 0,
            brushSize,
            brushColor,
            result: result.status === 'fulfilled' ? result.value : '失败',
            localResults: [{ label: result.status === 'fulfilled' ? result.value : '失败', prob: 1.0 }]
          });
        } catch (e) {
          console.error('保存记录失败:', e);
        }
      } else if (operationMode === 'api') {
        // 仅使用API模型
        const [result] = await Promise.allSettled([
          classifyWithAPI(canvas)
        ]);
        
        if (result.status === 'fulfilled') {
          setApiGuess(result.value);
          setGuess(result.value);
        } else {
          setApiGuess(`API模型失败: ${result.reason}`);
          setGuess(`API模型失败: ${result.reason}`);
        }
        
        // 流式评价
        try {
          await evaluateWithAPI(canvas, (chunk) => {
            setAiEvaluation(prev => prev + chunk);
          });
        } catch (e) {
          setAiEvaluation('评价失败');
        }
        
        // 保存统计记录
        try {
          saveRecord({
            timestamp: Date.now(),
            durationMs: 0,
            brushSize,
            brushColor,
            result: result.status === 'fulfilled' ? result.value : '失败',
            localResults: []
          });
        } catch (e) {
          console.error('保存记录失败:', e);
        }
      } else if (operationMode === 'simultaneous') {
        // 同时使用Olla和API模型
        const [ollaResult, apiResult] = await Promise.allSettled([
          classifyWithOlla(canvas),
          classifyWithAPI(canvas)
        ]);
        
        let ollaResultText = '';
        let apiResultText = '';
        
        if (ollaResult.status === 'fulfilled') {
          ollaResultText = ollaResult.value;
          setOllaGuess(ollaResultText);
        } else {
          ollaResultText = `Ollama模型失败: ${ollaResult.reason}`;
          setOllaGuess(ollaResultText);
        }
        
        if (apiResult.status === 'fulfilled') {
          apiResultText = apiResult.value;
          setApiGuess(apiResultText);
        } else {
          apiResultText = `API模型失败: ${apiResult.reason}`;
          setApiGuess(apiResultText);
        }
        
        // 设置主要猜测结果为API结果（如果API成功），否则使用Olla结果
        const primaryResult = apiResult.status === 'fulfilled' 
          ? apiResultText 
          : ollaResultText;
        setGuess(primaryResult);
        
        // 流式评价（同时模式使用API评价）
        try {
          await evaluateWithAPI(canvas, (chunk) => {
            setAiEvaluation(prev => prev + chunk);
          });
        } catch (e) {
          setAiEvaluation('评价失败');
        }
        
        // 保存统计记录
        try {
          saveRecord({
            timestamp: Date.now(),
            durationMs: 0,
            brushSize,
            brushColor,
            result: primaryResult,
            localResults: ollaResult.status === 'fulfilled' ? [{ label: ollaResultText, prob: 1.0 }] : []
          });
        } catch (e) {
          console.error('保存记录失败:', e);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('请求超时，请检查网络连接');
      } else {
        setError(err instanceof Error ? err.message : '发生错误');
      }
      console.error('Error submitting drawing:', err);
    } finally {
      setIsLoading(false);
      setIsEvaluating(false);
    }
  }, [operationMode, classifyWithOlla, classifyWithAPI, evaluateWithOlla, evaluateWithAPI, brushSize, brushColor]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>🎨 你画我猜</h1>
          <div className={styles.headerButtons}>
            <button 
              onClick={() => setShowSettings(true)}
              className={styles.settingsButton}
              title="设置"
            >
              ⚙️
            </button>
          </div>
        </div>
        <p className={styles.subtitle}>在画布上作画，让AI猜测你画的是什么</p>
      </div>

      <div className={styles.main}>
        {/* 左侧工具栏 */}
        <div className={styles.sidebar}>
          {/* 画笔工具 */}
          <div className={styles.toolbar}>
            <div className={styles.toolGroup}>
              <label className={styles.toolLabel}>工具：</label>
              <div className={styles.toolMode}>
                <button
                  className={`${styles.toolModeButton} ${!isEraserMode ? styles.toolModeButtonActive : ''}`}
                  onClick={() => setIsEraserMode(false)}
                  title="画笔模式"
                >
                  🖌️ 画笔
                </button>
                <button
                  className={`${styles.toolModeButton} ${isEraserMode ? styles.toolModeButtonActive : ''}`}
                  onClick={() => setIsEraserMode(true)}
                  title="橡皮擦模式"
                >
                  🧹 橡皮擦
                </button>
              </div>
            </div>
            <div className={styles.toolGroup}>
              <label className={styles.toolLabel}>画笔颜色：</label>
              <div className={`${styles.colorPicker} ${isEraserMode ? styles.disabledColorPicker : ''}`}>
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className={styles.colorInput}
                  disabled={isEraserMode}
                />
                <div className={styles.colorPresets}>
                  {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'].map((color) => (
                    <button
                      key={color}
                      className={`${styles.colorPreset} ${brushColor === color ? styles.colorPresetActive : ''} ${isEraserMode ? styles.disabledColorPreset : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => !isEraserMode && setBrushColor(color)}
                      title={color}
                      disabled={isEraserMode}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.toolGroup}>
              <label className={styles.toolLabel}>{isEraserMode ? '橡皮擦' : '画笔'}粗细：</label>
              <div className={styles.brushSizeControl}>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className={styles.brushSlider}
                />
                <span className={styles.brushSizeValue}>{brushSize}px</span>
              </div>
            </div>
          </div>

          {/* 工具按钮 */}
          <div className={styles.controls}>
            <button 
              onClick={clearCanvas} 
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              🗑️ 清除画布
            </button>
            <button 
              onClick={undoLastStroke} 
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              ↩️ 撤销
            </button>
          </div>

          {/* 结果显示 */}
          <div className={styles.result}>
            {/* 非同时模式显示主要AI猜测 */}
            {operationMode !== 'simultaneous' && (
              <>
                <h3>
                  {operationMode === 'ollama' ? '🦙 Ollama猜测：' : 
                   operationMode === 'api' ? '🌐 API猜测：' : 
                   'AI猜测：'}
                </h3>
                {guess ? (
                  <p className={styles.guessText}>{guess}</p>
                ) : (
                  <p className={`${styles.guessText} ${styles.placeholderText}`}></p>
                )}
              </>
            )}
            
            {/* 同时模式下显示两种结果 */}
            {operationMode === 'simultaneous' && (
              <div className={styles.simultaneousResults}>
                <div className={styles.resultItem}>
                  <h4>🦙 Olla结果：</h4>
                  {ollaGuess ? (
                    <p>{ollaGuess}</p>
                  ) : (
                    <p className={styles.placeholderText}>等待中...</p>
                  )}
                </div>
                <div className={styles.resultItem}>
                  <h4>🌐 API结果：</h4>
                  {apiGuess ? (
                    <p>{apiGuess}</p>
                  ) : (
                    <p className={styles.placeholderText}>等待中...</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI评价显示 */}
          <div className={styles.evaluation}>
            <h3 className={styles.evaluationTitle}>
              🤖 AI评价
            </h3>
            <div className={`${styles.evaluationContent} ${isEvaluating && !aiEvaluation ? styles.evaluationLoading : ''}`}>
              {isEvaluating && !aiEvaluation ? (
                <p className={styles.placeholderText}>正在评价中...</p>
              ) : aiEvaluation ? (
                <p>
                  {aiEvaluation}
                  {isEvaluating && <span className={styles.cursor}>|</span>}
                </p>
              ) : (
                <p className={styles.placeholderText}>提交画作后显示AI评价</p>
              )}
            </div>
          </div>

        </div>

        {/* 右侧内容区 */}
        <div className={styles.content}>
          <div className={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* 控制按钮 */}
          <div className={styles.controls}>
            <button 
              onClick={generateNewTopic} 
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              {currentTopic ? currentTopic : "🎲 随机题目"}
            </button>
            <button 
              onClick={submitDrawing} 
              className={`${styles.button} ${styles.buttonPrimary} ${isLoading ? styles.loading : ''}`}
              disabled={isLoading}
            >
              {isLoading ? '🤔 思考中...' : '🎯 提交猜测'}
            </button>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* 设置浮窗 */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        apiConfig={apiConfig}
        setApiConfig={setApiConfig}
        ollaConfig={ollaConfig}
        setOllaConfig={setOllaConfig}
        operationMode={operationMode}
        setOperationMode={setOperationMode}
        onSave={() => {
          // 配置已保存在SettingsModal组件中
          console.log('配置已保存');
        }}
      />
    </div>
  );
}








