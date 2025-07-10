import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import StockViewer from '../components/client/StockViewer';
import OrderForm from '../components/client/OrderForm';
import OrderHistoryList from '../components/client/OrderHistoryList';

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
}

interface OrderData {
  productId: string;
  quantity: number;
  deliveryAddress: string;
  contactNumber: string;
  specialInstructions?: string;
}

const ClientDashboard = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'order' | 'history'>('stock');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | undefined>();

  const handleProductSelect = (product: SelectedProduct) => {
    setSelectedProduct(product);
    setActiveTab('order');
  };

  const handleOrderSubmit = async (orderData: OrderData) => {
    try {
      // TODO: Implement order submission to backend
      console.log('Submitting order:', {
        ...orderData,
        productName: selectedProduct?.name,
        productPrice: selectedProduct?.price,
      });
      
      // Show success message (you might want to add a toast notification here)
      alert('Order placed successfully!');
      
      // Reset selection after order is placed
      setSelectedProduct(undefined);
      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  return (
    <DashboardLayout userType="client">
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
            View Stock
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`px-3 py-2 rounded-md ${
              activeTab === 'order'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Place Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 rounded-md ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Order History
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        {activeTab === 'stock' && (
          <StockViewer onProductSelect={handleProductSelect} />
        )}

        {activeTab === 'order' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Place New Order</h2>
            <OrderForm
              onSubmit={handleOrderSubmit}
              selectedProduct={selectedProduct}
            />
          </div>
        )}

        {activeTab === 'history' && <OrderHistoryList />}
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard; 