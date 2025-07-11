import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import StockViewer from '../components/client/StockViewer';
import OrderForm from '../components/client/OrderForm';
import OrderHistoryList from '../components/client/OrderHistoryList';
import { showToast } from '../utils/toast';

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
      const loadingToastId = showToast.loading('Processing your order...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would be an API call to submit the order
      const orderPayload = {
        ...orderData,
        productName: selectedProduct?.name,
        productPrice: selectedProduct?.price,
        totalPrice: (selectedProduct?.price || 0) * orderData.quantity,
        orderDate: new Date().toISOString(),
        status: 'pending',
      };
      
      showToast.update(loadingToastId, 'Order placed successfully!', 'success');
      
      // Reset selection after order is placed
      setSelectedProduct(undefined);
      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting order:', error);
      showToast.error('Failed to place order. Please try again.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stock':
        return <StockViewer onProductSelect={handleProductSelect} />;
      case 'order':
        return (
          <OrderForm 
            onSubmit={handleOrderSubmit} 
            selectedProduct={selectedProduct} 
          />
        );
      case 'history':
        return <OrderHistoryList />;
      default:
        return <StockViewer onProductSelect={handleProductSelect} />;
    }
  };

  return (
    <DashboardLayout userType="client">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('stock')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stock'
                  ? 'border-[#BE202E] text-[#BE202E]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available Stock
            </button>
            <button
              onClick={() => setActiveTab('order')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'order'
                  ? 'border-[#BE202E] text-[#BE202E]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Place Order
              {selectedProduct && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#BE202E] text-white">
                  {selectedProduct.name}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-[#BE202E] text-[#BE202E]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard; 