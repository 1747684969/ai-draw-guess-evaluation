// 响应式适配脚本
(function() {
  'use strict';

  // 等待DOM加载完成
  document.addEventListener('DOMContentLoaded', function() {
    initResponsiveHelper();
  });

  // 初始化响应式辅助功能
  function initResponsiveHelper() {
    // 立即执行一次调整
    adjustCanvasSize();
    adjustLayoutForScreenSize();
    applyAllOptimizations();
    
    // 监听窗口大小变化
    window.addEventListener('resize', debounce(function() {
      adjustCanvasSize();
      adjustLayoutForScreenSize();
      applyAllOptimizations();
    }, 250));
    
    // 监听屏幕方向变化
    window.addEventListener('orientationchange', function() {
      setTimeout(function() {
        adjustCanvasSize();
        adjustLayoutForScreenSize();
        applyAllOptimizations();
      }, 300);
    });
    
    // 监听设备像素比变化（例如在不同显示器之间移动）
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', function() {
      optimizeForHighDPI();
    });
  }

  // 调整画布尺寸
  function adjustCanvasSize() {
    const canvas = document.getElementById('canvas');
    const canvasWrapper = document.querySelector('.canvasWrapper');
    
    if (!canvas || !canvasWrapper) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const aspectRatio = viewportWidth / viewportHeight;
    
    // 获取CSS变量值
    const computedStyle = getComputedStyle(document.documentElement);
    let canvasMaxWidth = parseFloat(computedStyle.getPropertyValue('--canvas-max-width')) || 600;
    let canvasMaxHeight = parseFloat(computedStyle.getPropertyValue('--canvas-max-height')) || 400;
    
    // 根据视口尺寸动态调整画布大小
    let canvasWidth, canvasHeight;
    
    // 计算可用空间（考虑侧边栏和内边距）
    const sidebarWidth = parseFloat(computedStyle.getPropertyValue('--sidebar-width')) || 240;
    const gapSize = parseFloat(computedStyle.getPropertyValue('--gap-size')) || 16;
    const containerPadding = parseFloat(computedStyle.getPropertyValue('--container-padding')) || 8;
    
    // 计算内容区域的可用宽度
    const availableWidth = viewportWidth - (sidebarWidth + gapSize * 2 + containerPadding * 2);
    const availableHeight = viewportHeight - 100; // 减去头部和其他UI元素的高度
    
    // 根据可用空间和屏幕尺寸设置画布尺寸
    if (viewportWidth <= 479) {
      // 小型手机
      canvasWidth = Math.min(availableWidth * 0.9, canvasMaxWidth * 0.6);
      canvasHeight = canvasWidth * 0.75;
    } else if (viewportWidth <= 767) {
      // 手机
      canvasWidth = Math.min(availableWidth * 0.85, canvasMaxWidth * 0.7);
      canvasHeight = canvasWidth * 0.75;
    } else if (viewportWidth <= 1023) {
      // 平板
      canvasWidth = Math.min(availableWidth * 0.8, canvasMaxWidth * 0.8);
      canvasHeight = canvasWidth * 0.75;
    } else {
      // 桌面设备
      canvasWidth = Math.min(availableWidth * 0.9, canvasMaxWidth);
      canvasHeight = Math.min(availableHeight * 0.7, canvasMaxHeight);
      
      // 保持宽高比
      const aspectRatio = canvasMaxWidth / canvasMaxHeight;
      if (canvasWidth / aspectRatio > canvasHeight) {
        canvasWidth = canvasHeight * aspectRatio;
      } else {
        canvasHeight = canvasWidth / aspectRatio;
      }
    }
    
    // 根据宽高比微调
    if (aspectRatio < 1) {
      // 竖屏设备，进一步减小画布
      canvasWidth *= 0.85;
      canvasHeight *= 0.85;
    }
    
    // 确保画布尺寸不会太小
    canvasWidth = Math.max(canvasWidth, 200);
    canvasHeight = Math.max(canvasHeight, 150);
    
    // 应用尺寸
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // 不再设置画布容器的固定尺寸，让其自适应
    // canvasWrapper.style.width = canvasWidth + 'px';
    // canvasWrapper.style.height = canvasHeight + 'px';
  }

  // 根据屏幕尺寸调整布局
  function adjustLayoutForScreenSize() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const aspectRatio = viewportWidth / viewportHeight;
    
    // 获取CSS变量值
    const computedStyle = getComputedStyle(document.documentElement);
    const sidebarWidth = parseFloat(computedStyle.getPropertyValue('--sidebar-width')) || 240;
    const gapSize = parseFloat(computedStyle.getPropertyValue('--gap-size')) || 16;
    
    // 动态调整CSS变量以适应屏幕尺寸
    const rootElement = document.documentElement;
    
    // 根据视口宽度调整变量
    if (viewportWidth <= 479) {
      // 小型手机
      rootElement.style.setProperty('--sidebar-width', '100%');
      rootElement.style.setProperty('--gap-size', '0.4rem');
      rootElement.style.setProperty('--container-padding', '0.1rem');
    } else if (viewportWidth <= 767) {
      // 手机
      rootElement.style.setProperty('--sidebar-width', '100%');
      rootElement.style.setProperty('--gap-size', '0.5rem');
      rootElement.style.setProperty('--container-padding', '0.2rem');
    } else if (viewportWidth <= 1023) {
      // 平板
      rootElement.style.setProperty('--sidebar-width', '100%');
      rootElement.style.setProperty('--gap-size', '0.7rem');
      rootElement.style.setProperty('--container-padding', '0.3rem');
    } else if (viewportWidth <= 1199) {
      // 中小屏幕
      rootElement.style.setProperty('--sidebar-width', '240px');
      rootElement.style.setProperty('--gap-size', '0.8rem');
      rootElement.style.setProperty('--container-padding', '0.4rem');
    } else if (viewportWidth <= 1399) {
      // 中等屏幕
      rootElement.style.setProperty('--sidebar-width', '250px');
      rootElement.style.setProperty('--gap-size', '0.9rem');
      rootElement.style.setProperty('--container-padding', '0.5rem');
    } else if (viewportWidth <= 1599) {
      // 中大屏幕
      rootElement.style.setProperty('--sidebar-width', '260px');
      rootElement.style.setProperty('--gap-size', '1rem');
      rootElement.style.setProperty('--container-padding', '0.6rem');
    } else if (viewportWidth <= 1919) {
      // 大屏幕
      rootElement.style.setProperty('--sidebar-width', '280px');
      rootElement.style.setProperty('--gap-size', '1.1rem');
      rootElement.style.setProperty('--container-padding', '0.8rem');
    } else {
      // 超宽屏幕
      rootElement.style.setProperty('--sidebar-width', '300px');
      rootElement.style.setProperty('--gap-size', '1.2rem');
      rootElement.style.setProperty('--container-padding', '1rem');
    }
    
    // 根据宽高比进一步调整
    if (aspectRatio < 1) {
      // 竖屏设备
      rootElement.style.setProperty('--canvas-max-width', '400px');
      rootElement.style.setProperty('--canvas-max-height', '300px');
    } else {
      // 横屏设备
      rootElement.style.setProperty('--canvas-max-width', '600px');
      rootElement.style.setProperty('--canvas-max-height', '400px');
    }
    
    // 特殊布局调整
    const main = document.querySelector('.main');
    const sidebar = document.querySelector('.sidebar');
    const result = document.querySelector('.result');
    
    if (!main || !sidebar || !result) return;
    
    // 小屏幕设备特殊处理
    if (viewportWidth <= 1023) {
      // 确保结果框跨越所有列
      result.style.gridColumn = '1 / -1';
    } else {
      // 重置列跨越
      result.style.gridColumn = '';
    }
    
    // 极小屏幕设备布局调整
    if (viewportWidth <= 319) {
      const toolMode = document.querySelector('.toolMode');
      const controls = document.querySelector('.controls');
      
      if (toolMode) {
        toolMode.style.flexDirection = 'column';
      }
      
      if (controls) {
        controls.style.flexDirection = 'column';
        controls.style.gap = '0.3rem';
      }
    }
  }

  // 防抖函数
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  }

  // 检测设备类型
  function detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return {
      isMobile: isMobile && !isTablet,
      isTablet: isTablet,
      isDesktop: !isMobile && !isTablet,
      isTouchDevice: isTouchDevice
    };
  }

  // 针对触摸设备的优化
  function optimizeForTouchDevices() {
    const device = detectDeviceType();
    
    if (device.isTouchDevice) {
      // 增大触摸目标尺寸
      const buttons = document.querySelectorAll('.button, .toolModeButton, .colorPreset');
      buttons.forEach(button => {
        button.style.minHeight = '44px';
        button.style.minWidth = '44px';
      });
      
      // 增大滑块控制
      const sliders = document.querySelectorAll('.brushSlider');
      sliders.forEach(slider => {
        slider.style.height = '8px';
        
        // 修改滑块手柄大小
        const style = document.createElement('style');
        style.textContent = `
          input[type="range"]::-webkit-slider-thumb {
            width: 24px;
            height: 24px;
          }
          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
          }
        `;
        document.head.appendChild(style);
      });
    }
  }

  // 高DPI屏幕优化
  function optimizeForHighDPI() {
    const pixelRatio = window.devicePixelRatio || 1;
    
    if (pixelRatio > 1.5) {
      const canvas = document.getElementById('canvas');
      if (canvas) {
        canvas.style.imageRendering = 'crisp-edges';
        canvas.style.imageRendering = '-webkit-optimize-contrast';
      }
    }
  }

  // 应用所有优化
  function applyAllOptimizations() {
    optimizeForTouchDevices();
    optimizeForHighDPI();
  }

  // 初始化时应用优化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllOptimizations);
  } else {
    applyAllOptimizations();
  }

  // 导出函数供外部调用（如果需要）
  window.ResponsiveHelper = {
    adjustCanvasSize,
    adjustLayoutForScreenSize,
    detectDeviceType,
    optimizeForTouchDevices,
    optimizeForHighDPI
  };
})();