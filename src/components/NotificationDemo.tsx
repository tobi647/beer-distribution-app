import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationDemo: React.FC = () => {
  const { success, error, warning, info, loading, updateNotification } = useNotifications();

  const handleSuccess = () => {
    success('Stock updated successfully!');
  };

  const handleError = () => {
    error('Failed to save changes. Please try again.');
  };

  const handleWarning = () => {
    warning('Low stock alert: Premium Lager is running low');
  };

  const handleInfo = () => {
    info('New supplier added to the system');
  };

  const handleLoading = () => {
    const id = loading('Processing your request...');
    
    // Simulate async operation
    setTimeout(() => {
      updateNotification(id, 'Request completed successfully!', 'success');
    }, 3000);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Test Notification System</h3>
      <div className="space-y-3">
        <button
          onClick={handleSuccess}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 mr-3"
        >
          Show Success
        </button>
        <button
          onClick={handleError}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 mr-3"
        >
          Show Error
        </button>
        <button
          onClick={handleWarning}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 mr-3"
        >
          Show Warning
        </button>
        <button
          onClick={handleInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mr-3"
        >
          Show Info
        </button>
        <button
          onClick={handleLoading}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Show Loading → Success
        </button>
      </div>
    </div>
  );
};

export default NotificationDemo; 