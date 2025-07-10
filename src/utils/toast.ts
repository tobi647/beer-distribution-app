import { toast } from 'react-toastify';
import type { ToastContent, ToastOptions } from 'react-toastify';

interface CustomToastOptions extends ToastOptions {
  autoClose?: number | false;
}

export const showToast = {
  success: (message: ToastContent, options?: CustomToastOptions) =>
    toast.success(message, { ...options }),
  error: (message: ToastContent, options?: CustomToastOptions) =>
    toast.error(message, { ...options }),
  warning: (message: ToastContent, options?: CustomToastOptions) =>
    toast.warning(message, { ...options }),
  info: (message: ToastContent, options?: CustomToastOptions) =>
    toast.info(message, { ...options }),
  loading: (message: ToastContent, options?: CustomToastOptions) =>
    toast.loading(message, { ...options }),
  update: (
    toastId: string | number,
    message: ToastContent,
    type: 'success' | 'error' | 'warning' | 'info'
  ) => {
    toast.update(toastId, {
      render: message,
      type,
      isLoading: false,
      autoClose: 3000,
    });
  },
  dismiss: (toastId?: string | number) => toast.dismiss(toastId),
}; 