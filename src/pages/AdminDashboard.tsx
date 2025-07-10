import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import StockManager from '../components/admin/StockManager';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'orders' | 'stats'>('stock');

  return (
    <DashboardLayout userType="admin">
      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-2 rounded-md ${
              activeTab === 'stock'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Stock List
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-2 rounded-md ${
              activeTab === 'orders'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Order List
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-2 rounded-md ${
              activeTab === 'stats'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sales Stats
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        {activeTab === 'stock' && <StockManager />}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Order Management</h2>
            {/* OrderManager component will go here */}
            <p className="text-gray-500">Order management interface coming soon...</p>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Sales Statistics</h2>
            {/* StatsDisplay component will go here */}
            <p className="text-gray-500">Sales statistics interface coming soon...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard; 