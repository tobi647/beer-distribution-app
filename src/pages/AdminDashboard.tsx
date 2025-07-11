import { useState, useCallback, memo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import StockManager from '../components/admin/StockManager';
import NotificationSystem from '../components/NotificationSystem';
import { useNotifications } from '../hooks/useNotifications';

type TabType = 'stock' | 'orders' | 'stats';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton = memo(({ label, isActive, onClick }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-md ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'text-gray-600 hover:bg-gray-200'
    }`}
  >
    {label}
  </button>
));

TabButton.displayName = 'TabButton';

const TabContent = memo(({ activeTab }: { activeTab: TabType }) => {
  if (activeTab === 'stock') {
    return <StockManager />;
  }

  if (activeTab === 'orders') {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Order Management</h2>
        <p className="text-gray-500">Order management interface coming soon...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Sales Statistics</h2>
      <p className="text-gray-500">Sales statistics interface coming soon...</p>
    </div>
  );
});

TabContent.displayName = 'TabContent';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const { notifications, removeNotification } = useNotifications();

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  return (
    <DashboardLayout userType="admin">
      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-4">
          <TabButton
            label="Stock List"
            isActive={activeTab === 'stock'}
            onClick={() => handleTabChange('stock')}
          />
          <TabButton
            label="Order List"
            isActive={activeTab === 'orders'}
            onClick={() => handleTabChange('orders')}
          />
          <TabButton
            label="Sales Stats"
            isActive={activeTab === 'stats'}
            onClick={() => handleTabChange('stats')}
          />
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <TabContent activeTab={activeTab} />
      </div>

      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={removeNotification} 
      />
    </DashboardLayout>
  );
};

export default memo(AdminDashboard); 