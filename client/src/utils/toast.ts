// client/src/utils/toast.ts - 간단한 토스트 유틸리티
export const toast = {
  success: (message: string) => {
    if (import.meta.env.DEV) console.info('✅ Toast Success:', message);
    showBrowserToast(message, 'success');
  },
  error: (message: string) => {
    if (import.meta.env.DEV) console.error('❌ Toast Error:', message);
    showBrowserToast(message, 'error');
  },
  info: (message: string) => {
    if (import.meta.env.DEV) console.info('ℹ️ Toast Info:', message);
    showBrowserToast(message, 'info');
  },
  warning: (message: string) => {
    if (import.meta.env.DEV) console.warn('⚠️ Toast Warning:', message);
    showBrowserToast(message, 'warning');
  },
};

function showBrowserToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
  const toast = document.createElement('div');

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  const bgColors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b',
  };

  toast.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background-color: ${bgColors[type]};
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.875rem;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  toast.innerHTML = `
    <span>${icons[type]}</span>
    <span>${escapeHtml(message)}</span>
  `;

  // 애니메이션 스타일 추가 (한번만)
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // 3초 후 제거
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default toast;
