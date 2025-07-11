import { useState, useCallback } from 'react';
import type { Notification } from '../components/NotificationSystem';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' | 'loading',
    options: { autoClose?: number | false; persistent?: boolean } = {}
  ): string => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const notification: Notification = {
      id,
      message,
      type,
      autoClose: options.autoClose,
      persistent: options.persistent,
    };

    setNotifications(prev => [...prev, notification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const updateNotification = useCallback((id: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, message, type, persistent: false }
          : notification
      )
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenient methods
  const success = useCallback((message: string, options?: { autoClose?: number | false }) => 
    addNotification(message, 'success', options), [addNotification]);

  const error = useCallback((message: string, options?: { autoClose?: number | false }) => 
    addNotification(message, 'error', options), [addNotification]);

  const warning = useCallback((message: string, options?: { autoClose?: number | false }) => 
    addNotification(message, 'warning', options), [addNotification]);

  const info = useCallback((message: string, options?: { autoClose?: number | false }) => 
    addNotification(message, 'info', options), [addNotification]);

  const loading = useCallback((message: string) => 
    addNotification(message, 'loading', { autoClose: false, persistent: true }), [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    updateNotification,
    clearNotifications,
    success,
    error,
    warning,
    info,
    loading,
  };
}; 