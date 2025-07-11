import { toast } from 'react-toastify';
import type { ToastContent, ToastOptions } from 'react-toastify';

interface CustomToastOptions extends ToastOptions {
  autoClose?: number | false;
}

// Modern subtle notification system
class NotificationManager {
  private notifications: Map<string, HTMLElement> = new Map();
  private container: HTMLElement | null = null;

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private createNotification(
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' | 'loading',
    options: { autoClose?: number | false; persistent?: boolean } = {}
  ): string {
    const id = Date.now().toString();
    const container = this.getContainer();
    
    const notification = document.createElement('div');
    notification.id = `notification-${id}`;
    
    // Base styles for all notifications
    const baseClasses = 'transform transition-all duration-300 ease-in-out pointer-events-auto max-w-sm';
    
    // Type-specific styles
    const typeStyles = {
      success: 'bg-green-50 border-l-4 border-green-400 text-green-800',
      error: 'bg-red-50 border-l-4 border-red-400 text-red-800',
      warning: 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800',
      info: 'bg-blue-50 border-l-4 border-blue-400 text-blue-800',
      loading: 'bg-gray-50 border-l-4 border-gray-400 text-gray-800'
    };

    // Icon for each type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '⟳'
    };

    notification.className = `${baseClasses} ${typeStyles[type]} p-3 rounded-r-lg shadow-sm border-t border-r border-b opacity-0 translate-x-full`;
    
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 mr-3">
          <span class="text-sm font-medium ${type === 'loading' ? 'animate-spin' : ''}">${icons[type]}</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        ${!options.persistent ? `
          <button onclick="window.dismissNotification('${id}')" class="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity">
            <span class="text-xs">✕</span>
          </button>
        ` : ''}
      </div>
    `;

    container.appendChild(notification);
    this.notifications.set(id, notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.remove('opacity-0', 'translate-x-full');
      notification.classList.add('opacity-100', 'translate-x-0');
    });

    // Auto dismiss
    if (options.autoClose !== false) {
      const delay = options.autoClose || (type === 'error' ? 4000 : 2500);
      setTimeout(() => this.dismiss(id), delay);
    }

    return id;
  }

  dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.notifications.delete(id);
      }, 300);
    }
  }

  update(id: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.dismiss(id);
    this.createNotification(message, type);
  }

  success(message: string, options?: { autoClose?: number | false }): string {
    return this.createNotification(message, 'success', options);
  }

  error(message: string, options?: { autoClose?: number | false }): string {
    return this.createNotification(message, 'error', options);
  }

  warning(message: string, options?: { autoClose?: number | false }): string {
    return this.createNotification(message, 'warning', options);
  }

  info(message: string, options?: { autoClose?: number | false }): string {
    return this.createNotification(message, 'info', options);
  }

  loading(message: string): string {
    return this.createNotification(message, 'loading', { autoClose: false, persistent: true });
  }
}

const notificationManager = new NotificationManager();

// Global dismiss function
(window as any).dismissNotification = (id: string) => {
  notificationManager.dismiss(id);
};

// Export both old interface for compatibility and new modern interface
export const showToast = {
  success: (message: ToastContent, options?: CustomToastOptions) => {
    if (typeof message === 'string') {
      return notificationManager.success(message, { autoClose: options?.autoClose });
    }
    return toast.success(message, { ...options });
  },
  error: (message: ToastContent, options?: CustomToastOptions) => {
    if (typeof message === 'string') {
      return notificationManager.error(message, { autoClose: options?.autoClose });
    }
    return toast.error(message, { ...options });
  },
  warning: (message: ToastContent, options?: CustomToastOptions) => {
    if (typeof message === 'string') {
      return notificationManager.warning(message, { autoClose: options?.autoClose });
    }
    return toast.warning(message, { ...options });
  },
  info: (message: ToastContent, options?: CustomToastOptions) => {
    if (typeof message === 'string') {
      return notificationManager.info(message, { autoClose: options?.autoClose });
    }
    return toast.info(message, { ...options });
  },
  loading: (message: ToastContent, options?: CustomToastOptions) => {
    if (typeof message === 'string') {
      return notificationManager.loading(message);
    }
    return toast.loading(message, { ...options });
  },
  update: (
    toastId: string | number,
    message: ToastContent,
    type: 'success' | 'error' | 'warning' | 'info'
  ) => {
    if (typeof message === 'string') {
      notificationManager.update(String(toastId), message, type);
    } else {
      toast.update(toastId, {
        render: message,
        type,
        isLoading: false,
        autoClose: 3000,
      });
    }
  },
  dismiss: (toastId?: string | number) => {
    if (toastId) {
      notificationManager.dismiss(String(toastId));
    } else {
      toast.dismiss(toastId);
    }
  },
};

// Export the modern notification system directly
export const notify = notificationManager; 