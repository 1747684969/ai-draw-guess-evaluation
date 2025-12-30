'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import styles from './page.module.css';
// import { loadModel, classifyCanvas, Classification } from '../lib/models/imageClassifier';
// import { saveRecord } from '../lib/stats';

interface ApiConfig {
  apiKey: string;
  modelName: string;
  apiUrl: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [guess, setGuess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [isEraserMode, setIsEraserMode] = useState<boolean>(false);
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apiKey: '',
    modelName: 'gemini-1.5-flash',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
  });

  // 随机题目列表
  const topics = useMemo(() => [
    '苹果', '香蕉', '橙子', '草莓', '西瓜',
    '猫', '狗', '兔子', '熊猫', '老虎',
    '汽车', '飞机', '火车', '自行车', '船',
    '房子', '树', '花', '太阳', '月亮',
    '书', '笔', '电脑', '手机', '杯子',
    '帽子', '鞋子', '衣服', '包', '眼镜',
    '蛋糕', '冰淇淋', '汉堡', '披萨', '面条',
    '足球', '篮球', '乒乓球', '羽毛球', '网球',
    '彩虹', '星星', '云朵', '雨伞', '礼物'
  ], []);

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
  }, []);

  // 更新画布上下文设置（只更新画笔属性，不清除画布）
  const updateCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
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
  }, [brushColor, brushSize, isEraserMode]);

  // 初始化画布（只在组件首次挂载时执行一次）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布样式（只在首次初始化时清除）
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateCanvasContext();
    
    // 保存初始状态
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory([imageData]);
    setHistoryIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 当画笔颜色或大小改变时，只更新上下文设置，不清除画布
  useEffect(() => {
    updateCanvasContext();
  }, [updateCanvasContext]);

  // 保存画布状态到历史记录
  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // 撤销上一笔
  const undoLastStroke = useCallback(() => {
    if (historyIndex <= 0) {
      // 如果没有历史记录，清除画布
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setCanvasHistory([]);
      setHistoryIndex(-1);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 恢复到上一个状态
    const newIndex = historyIndex - 1;
    const previousState = canvasHistory[newIndex];
    
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [canvasHistory, historyIndex]);

  // 清除画布
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setGuess('');
    setError('');
    // 清除历史记录
    setCanvasHistory([]);
    setHistoryIndex(-1);
  }, []);

  // 获取随机题目
  const getRandomTopic = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * topics.length);
    return topics[randomIndex];
  }, [topics]);

  // 生成新题目
  const generateNewTopic = useCallback(() => {
    const newTopic = getRandomTopic();
    setCurrentTopic(newTopic);
    clearCanvas();
  }, [getRandomTopic, clearCanvas]);

  // 保存配置
  const saveConfig = useCallback(() => {
    localStorage.setItem('geminiApiConfig', JSON.stringify(apiConfig));
    setShowSettings(false);
    alert('配置已保存！');
  }, [apiConfig]);

  // 获取鼠标/触摸位置
  const getCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  // 开始绘制
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 在开始绘制前保存当前状态
    saveCanvasState();

    updateCanvasContext();

    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }, [getCoordinates, updateCanvasContext, saveCanvasState]);

  // 绘制中
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }, [isDrawing, getCoordinates]);

  // 停止绘制
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // 提交画作让AI猜测
  const submitDrawing = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 检查配置
    if (!apiConfig.apiKey) {
      setError('请先在设置中配置API Key');
      setShowSettings(true);
      return;
    }

    if (!apiConfig.modelName) {
      setError('请先在设置中配置模型名称');
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setError('');
    setGuess('');

    try {
      // 将画布转换为base64图片
      const imageData = canvas.toDataURL('image/png');
      const base64Image = imageData.split(',')[1] || imageData;

      // 检测API类型：OpenAI兼容格式（包含chat/completions）还是Gemini格式
      const isOpenAIFormat = apiConfig.apiUrl.includes('chat/completions') || 
                              apiConfig.apiUrl.includes('moonshot') ||
                              apiConfig.apiUrl.includes('openai');

      let apiUrl: string;
      let requestBody: Record<string, unknown>;
      let headers: Record<string, string>;

      if (isOpenAIFormat) {
        // OpenAI兼容格式（如Moonshot、OpenAI等）
        const baseUrl = apiConfig.apiUrl.replace(/\/$/, '');
        
        // 如果URL不包含完整的路径，添加chat/completions
        if (baseUrl.includes('/chat/completions')) {
          apiUrl = baseUrl;
        } else {
          // 确保URL格式正确
          const cleanUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/chat\/completions\/?$/, '');
          apiUrl = `${cleanUrl}/v1/chat/completions`;
        }

        // OpenAI格式：API Key在Authorization header中
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        };

        // OpenAI格式的请求体
        requestBody = {
          model: apiConfig.modelName,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '这张图片中画的是什么？请用中文简洁直接地回答，只回答是什么，不要额外解释。'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 100
        };
      } else {
        // Gemini格式
        const baseUrl = apiConfig.apiUrl.replace(/\/$/, '');
        
        if (baseUrl.includes('/v1/') || baseUrl.includes('/v1beta/')) {
          // URL已经包含版本号
          apiUrl = `${baseUrl}/${apiConfig.modelName}:generateContent?key=${apiConfig.apiKey}`;
        } else {
          // URL不包含版本号，添加v1beta版本
          apiUrl = `${baseUrl}/v1beta/models/${apiConfig.modelName}:generateContent?key=${apiConfig.apiKey}`;
        }

        headers = {
          'Content-Type': 'application/json',
        };

        // Gemini格式的请求体
        requestBody = {
          contents: [{
            parts: [
              {
                text: "What is drawn in this image? Please describe it in Chinese, be concise and direct. Just answer what it is, no additional explanation."
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Image
                }
              }
            ]
          }]
        };
      }

      // 调用API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

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
          : ((errorData as Record<string, unknown>)?.error as Record<string, unknown>)?.message || (errorData as Record<string, unknown>)?.message || JSON.stringify(errorData);
        throw new Error(`API请求失败: ${errorMsg}`);
      }

      const data = await response.json();
      
      // 提取AI的猜测（根据不同的API格式）
      let guessResult: string;
      try {
        if (isOpenAIFormat) {
          // OpenAI格式：data.choices[0].message.content
          const openAIData = data as Record<string, unknown>;
          const choices = openAIData.choices as Record<string, unknown>[];
          const firstChoice = choices?.[0];
          const message = firstChoice?.message as Record<string, unknown>;
          guessResult = message?.content as string || '无法识别';
        } else {
          // Gemini格式：data.candidates[0].content.parts[0].text
          const geminiData = data as Record<string, unknown>;
          const candidates = geminiData.candidates as Record<string, unknown>[];
          const firstCandidate = candidates?.[0];
          const content = firstCandidate?.content as Record<string, unknown>;
          const parts = content?.parts as Record<string, unknown>[];
          guessResult = parts?.[0]?.text as string || '无法识别';
        }
      } catch {
        guessResult = '无法识别';
      }
      
      setGuess(guessResult);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('请求超时，请检查网络连接');
      } else {
        setError(err instanceof Error ? err.message : '发生错误');
      }
      console.error('Error submitting drawing:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiConfig]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>🎨 你画我猜</h1>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={styles.settingsButton}
            title="设置"
          >
            ⚙️
          </button>
        </div>
        <p className={styles.subtitle}>在画布上作画，让AI猜测你画的是什么</p>
      </div>

      {showSettings && (
        <div className={styles.settingsPanel}>
          <h3 className={styles.settingsTitle}>⚙️ API设置</h3>
          <div className={styles.settingsContent}>
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                API Key:
                <input
                  type="password"
                  className={styles.settingInput}
                  value={apiConfig.apiKey}
                  onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                  placeholder="输入你的Gemini API Key"
                />
              </label>
            </div>
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                模型名称:
                <input
                  type="text"
                  className={styles.settingInput}
                  value={apiConfig.modelName}
                  onChange={(e) => setApiConfig({ ...apiConfig, modelName: e.target.value })}
                  placeholder="例如: gemini-1.5-flash"
                />
              </label>
            </div>
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                API URL:
                <input
                  type="text"
                  className={styles.settingInput}
                  value={apiConfig.apiUrl}
                  onChange={(e) => setApiConfig({ ...apiConfig, apiUrl: e.target.value })}
                  placeholder="例如: https://generativelanguage.googleapis.com/v1beta/models"
                />
              </label>
            </div>
            <div className={styles.settingsButtons}>
              <button onClick={saveConfig} className={`${styles.button} ${styles.buttonPrimary}`}>
                💾 保存配置
              </button>
              <button 
                onClick={() => setShowSettings(false)} 
                className={styles.button}
              >
                取消
              </button>
            </div>
            <div className={styles.settingsHint}>
              <p>💡 提示：</p>
              <ul>
                <li><strong>API Key是必需的</strong>，请务必填写</li>
                <li>配置会保存在浏览器本地，不会上传到服务器</li>
                <li>API调用直接从浏览器发起，不使用后端服务器</li>
                <li><strong>支持的API格式：</strong></li>
                <li>• <strong>Gemini格式</strong>：URL示例 <code>https://generativelanguage.googleapis.com/v1beta/models</code>，模型如 <code>gemini-1.5-flash</code></li>
                <li>• <strong>OpenAI兼容格式</strong>（如Moonshot）：URL示例 <code>https://api.moonshot.cn/v1/chat/completions</code>，模型如 <code>moonshot-v1-8k</code></li>
                <li>• OpenAI格式的API Key需要在&quot;Authorization header&quot;中传递，会自动处理</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className={styles.main}>
        {/* 题目显示 */}
        {currentTopic && (
          <div className={styles.topicDisplay}>
            <h3 className={styles.topicTitle}>🎯 请画出：</h3>
            <p className={styles.topicText}>{currentTopic}</p>
            <button 
              onClick={generateNewTopic} 
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              🎲 换一个题目
            </button>
          </div>
        )}

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
          {!isEraserMode && (
            <div className={styles.toolGroup}>
              <label className={styles.toolLabel}>画笔颜色：</label>
              <div className={styles.colorPicker}>
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className={styles.colorInput}
                />
                <div className={styles.colorPresets}>
                  {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'].map((color) => (
                    <button
                      key={color}
                      className={`${styles.colorPreset} ${brushColor === color ? styles.colorPresetActive : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushColor(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
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

        <div className={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
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

        <div className={styles.controls}>
          {!currentTopic && (
            <button 
              onClick={generateNewTopic} 
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              🎲 随机题目
            </button>
          )}
          <button 
            onClick={undoLastStroke} 
            className={styles.button}
            disabled={isLoading || historyIndex <= 0}
            title="撤销上一笔"
          >
            ↶ 撤销
          </button>
          <button 
            onClick={clearCanvas} 
            className={styles.button}
            disabled={isLoading}
          >
            🗑️ 清除
          </button>
          <button 
            onClick={submitDrawing} 
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={isLoading}
          >
            {isLoading ? '🤔 AI正在思考...' : '🔍 AI猜测'}
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}

        {guess && (
          <div className={styles.result}>
            <h2 className={styles.resultTitle}>AI的猜测：</h2>
            <p className={styles.guess}>{guess}</p>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p>提示：使用鼠标或触摸屏在画布上绘制，然后点击&quot;AI猜测&quot;按钮</p>
      </div>
    </div>
  );
}







