import { useState, useEffect } from 'react';
import { formatUSD, getOrderStatusClass } from '../../utils/calculations';
import { mockOrders, type Order, MOCK_API_DELAY } from '../../constants/mockData';
import DataTable from '../DataTable';

const OrderHistoryList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, MOCK_API_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const columns = [
    {
      header: 'Order ID',
      accessor: 'id' as const,
      className: 'min-w-[120px]',
    },
    {
      header: 'Product',
      accessor: 'productName' as const,
      className: 'min-w-[150px]',
    },
    {
      header: 'Quantity',
      accessor: 'quantity' as const,
      className: 'text-center',
    },
    {
      header: 'Total Price',
      accessor: (order: Order) => (
        <span className="font-medium">{formatUSD(order.totalPrice)}</span>
      ),
      className: 'text-right',
    },
    {
      header: 'Date',
      accessor: (order: Order) => (
        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
      ),
      className: 'min-w-[120px]',
    },
    {
      header: 'Status',
      accessor: (order: Order) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusClass(order.status)}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      ),
      className: 'text-center',
    },
  ];

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-sansation">Order History</h2>
        <p className="text-gray-600 font-gotham">
          View your past orders and their current status
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <DataTable
          columns={columns}
          data={mockOrders}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      </div>

      {!isLoading && mockOrders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>You haven't placed any orders yet.</p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Order Details</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order ID</label>
                <p className="text-gray-900">{selectedOrder.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Product</label>
                <p className="text-gray-900">{selectedOrder.productName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <p className="text-gray-900">{selectedOrder.quantity} units</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Price</label>
                <p className="text-gray-900 font-medium">{formatUSD(selectedOrder.totalPrice)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Date</label>
                <p className="text-gray-900">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusClass(selectedOrder.status)}`}>
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                <p className="text-gray-900">{selectedOrder.deliveryAddress}</p>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryList; 