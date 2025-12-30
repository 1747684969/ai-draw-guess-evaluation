'use client';

import React from 'react';
import styles from './ModeSwitcher.module.css';

export type OperationMode = 'ollama' | 'api' | 'simultaneous';

interface ModeSwitcherProps {
  currentMode: OperationMode;
  onModeChange: (mode: OperationMode) => void;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ currentMode, onModeChange }) => {
  const modes = [
    {
      id: 'ollama' as OperationMode,
      name: 'Ollama Mode',
      description: 'Use local Ollama API for classification',
      icon: '🦙'
    },
    {
      id: 'api' as OperationMode,
      name: 'API Mode',
      description: 'Use external API for classification',
      icon: '🌐'
    },
    {
      id: 'simultaneous' as OperationMode,
      name: 'Simultaneous Mode',
      description: 'Compare both model results',
      icon: '⚡'
    }
  ];

  return (
    <div className={styles.modeSwitcher}>
      <div className={styles.modeTitle}>
        <h3>Operation Mode</h3>
        <p>Select how you want the AI to guess your drawings</p>
      </div>
      
      <div className={styles.modeOptions}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={`${styles.modeOption} ${currentMode === mode.id ? styles.active : ''}`}
            onClick={() => onModeChange(mode.id)}
          >
            <div className={styles.modeIcon}>{mode.icon}</div>
            <div className={styles.modeInfo}>
              <h4>{mode.name}</h4>
              <p>{mode.description}</p>
            </div>
            {currentMode === mode.id && (
              <div className={styles.activeIndicator}>
                <span>✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className={styles.modeStatus}>
        <div className={styles.currentMode}>
          <span className={styles.statusLabel}>Current Mode:</span>
          <span className={styles.statusValue}>
            {modes.find(m => m.id === currentMode)?.name}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModeSwitcher;