'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './SettingsModal.module.css';
import { OperationMode } from './ModeSwitcher';

interface ApiConfig {
  apiKey: string;
  modelName: string;
  apiUrl: string;
}

interface OllamaConfig {
  apiUrl: string;
  modelName: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiConfig: ApiConfig;
  setApiConfig: (config: ApiConfig) => void;
  ollaConfig: OllamaConfig;
  setOllaConfig: (config: OllamaConfig) => void;
  operationMode: OperationMode;
  setOperationMode: (mode: OperationMode) => void;
  onSave: () => void;
}

type TabType = 'api' | 'ollama' | 'mode';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiConfig,
  setApiConfig,
  ollaConfig,
  setOllaConfig,
  operationMode,
  setOperationMode,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [tempApiConfig, setTempApiConfig] = useState<ApiConfig>(apiConfig);
  const [tempOllaConfig, setTempOllaConfig] = useState<OllamaConfig>(ollaConfig);
  const [tempOperationMode, setTempOperationMode] = useState<OperationMode>(operationMode);
  const modalRef = useRef<HTMLDivElement>(null);

  // 当模态框打开时，更新临时配置
  useEffect(() => {
    if (isOpen) {
      setTempApiConfig(apiConfig);
      setTempOllaConfig(ollaConfig);
      setTempOperationMode(operationMode);
    }
  }, [isOpen, apiConfig, ollaConfig, operationMode]);

  // ESC键关闭模态框
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // 点击外部区域关闭模态框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 保存配置
  const handleSave = () => {
    setApiConfig(tempApiConfig);
    setOllaConfig(tempOllaConfig);
    setOperationMode(tempOperationMode);
    onSave();
    onClose();
  };

  // 取消操作
  const handleCancel = () => {
    // 恢复原始配置
    setTempApiConfig(apiConfig);
    setTempOllaConfig(ollaConfig);
    setTempOperationMode(operationMode);
    onClose();
  };

  // 保存API配置到localStorage
  const saveApiConfig = () => {
    localStorage.setItem('geminiApiConfig', JSON.stringify(tempApiConfig));
  };

  // 保存Ollama配置到localStorage
  const saveOllaConfig = () => {
    localStorage.setItem('ollamaConfig', JSON.stringify(tempOllaConfig));
    setOllaConfig(tempOllaConfig);
  }; // 保存操作模式到localStorage
  const saveOperationMode = () => {
    localStorage.setItem('operationMode', tempOperationMode);
  };

  // 统一保存所有配置
  const handleSaveAll = () => {
    saveApiConfig();
    saveOllaConfig();
    saveOperationMode();
    handleSave();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>⚙️ 设置</h2>
        </div>
        
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'api' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('api')}
            >
              🌐 API 配置
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'ollama' ? styles.activeTab : ''}`}
        onClick={() => setActiveTab('ollama')}
            >
              🦙 Ollama 配置
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'mode' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('mode')}
            >
              🔄 模式切换
            </button>
          </div>
          
          <div className={styles.tabContent}>
            {/* API 配置标签页 */}
            {activeTab === 'api' && (
              <div className={styles.tabPane}>
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    API Key:
                    <input
                      type="password"
                      className={styles.settingInput}
                      value={tempApiConfig.apiKey}
                      onChange={(e) => setTempApiConfig({ ...tempApiConfig, apiKey: e.target.value })}
                      placeholder="输入你的API Key（Ollama格式可留空）"
                    />
                  </label>
                </div>
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    模型名称:
                    <input
                      type="text"
                      className={styles.settingInput}
                      value={tempApiConfig.modelName}
                      onChange={(e) => setTempApiConfig({ ...tempApiConfig, modelName: e.target.value })}
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
                      value={tempApiConfig.apiUrl}
                      onChange={(e) => setTempApiConfig({ ...tempApiConfig, apiUrl: e.target.value })}
                      placeholder="例如: https://generativelanguage.googleapis.com/v1beta/models"
                    />
                  </label>
                </div>
                <div className={styles.settingsHint}>
                  <p>💡 提示：</p>
                  <ul>
                    <li><strong>API Key是必需的</strong></li>
                    <li>配置会保存在浏览器本地，不会上传到服务器</li>
                    <li>API调用直接从浏览器发起，不使用后端服务器</li>
                    <li><strong>支持的API格式：</strong></li>
                    <li>• <strong>Gemini格式</strong>：URL示例 <code>https://generativelanguage.googleapis.com/v1beta/models</code>，模型如 <code>gemini-1.5-flash</code></li>
                    <li>• <strong>OpenAI兼容格式</strong>（如Moonshot、OpenAI等）：URL示例 <code>https://api.moonshot.cn/v1/chat/completions</code>，模型如 <code>moonshot-v1-8k</code></li>
                    <li>• OpenAI格式的API Key需要在"Authorization header"中传递，会自动处理</li>
                  </ul>
                </div>
              </div>
            )}
            
            {/* Ollama 配置标签页 */}
      {activeTab === 'ollama' && (
              <div className={styles.tabPane}>
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    Ollama服务器地址:
                    <input
                      type="text"
                      className={styles.settingInput}
                      value={tempOllaConfig.apiUrl}
                      onChange={(e) => setTempOllaConfig({ ...tempOllaConfig, apiUrl: e.target.value })}
                      placeholder="例如: http://localhost:11434"
                    />
                  </label>
                </div>
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>
                    模型名称:
                    <input
                      type="text"
                      className={styles.settingInput}
                      value={tempOllaConfig.modelName}
                      onChange={(e) => setTempOllaConfig({ ...tempOllaConfig, modelName: e.target.value })}
                      placeholder="例如: llama3"
                    />
                  </label>
                </div>
                <div className={styles.settingsHint}>
                  <p>💡 提示：</p>
                  <ul>
                    <li>请确保Ollama服务已安装并正在运行</li>
                    <li>默认地址为 <code>http://localhost:11434</code></li>
                    <li>配置会保存在浏览器本地，不会上传到服务器</li>
                    <li>调用直接从浏览器发起，不使用后端服务器</li>
                    <li>支持的模型包括：llama3, codellama, mistral等</li>
                    <li>使用前请确保已下载相应的模型： <code>ollama pull llama3</code></li>
                  </ul>
                </div>
              </div>
            )}
            
            {/* 模型切换标签页 */}
            {activeTab === 'mode' && (
              <div className={styles.tabPane}>
                <div className={styles.modeOptions}>
                  <button
                    className={`${styles.modeOption} ${tempOperationMode === 'ollama' ? styles.activeMode : ''}`}
                    onClick={() => setTempOperationMode('ollama')}
                  >
                    <div className={styles.modeIcon}>🦙</div>
                    <div className={styles.modeInfo}>
                      <h4>Ollama 模式</h4>
                      <p>使用本地 Ollama API 进行分类</p>
                    </div>
                    {tempOperationMode === 'ollama' && (
                      <div className={styles.activeIndicator}>
                        <span>✓</span>
                      </div>
                    )}
                  </button>
                  
                  <button
                    className={`${styles.modeOption} ${tempOperationMode === 'api' ? styles.activeMode : ''}`}
                    onClick={() => setTempOperationMode('api')}
                  >
                    <div className={styles.modeIcon}>🌐</div>
                    <div className={styles.modeInfo}>
                      <h4>API 模式</h4>
                      <p>使用外部 API 进行分类</p>
                    </div>
                    {tempOperationMode === 'api' && (
                      <div className={styles.activeIndicator}>
                        <span>✓</span>
                      </div>
                    )}
                  </button>
                  
                  <button
                    className={`${styles.modeOption} ${tempOperationMode === 'simultaneous' ? styles.activeMode : ''}`}
                    onClick={() => setTempOperationMode('simultaneous')}
                  >
                    <div className={styles.modeIcon}>⚡</div>
                    <div className={styles.modeInfo}>
                      <h4>同时模式</h4>
                      <p>同时比较两种模型的结果</p>
                    </div>
                    {tempOperationMode === 'simultaneous' && (
                      <div className={styles.activeIndicator}>
                        <span>✓</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button onClick={handleSaveAll} className={`${styles.button} ${styles.buttonPrimary}`}>
            💾 保存
          </button>
          <button onClick={handleCancel} className={styles.button}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
