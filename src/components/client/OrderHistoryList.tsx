import { useState, useEffect } from 'react';
import DataTable from '../DataTable';

interface Order {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
  deliveryAddress: string;
}

const OrderHistoryList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // TODO: Replace with actual API call
  const mockOrders: Order[] = [
    {
      id: '1',
      productName: 'Pilsner Premium',
      quantity: 50,
      totalPrice: 249.50,
      orderDate: '2024-03-15T10:30:00Z',
      status: 'delivered',
      deliveryAddress: '123 Main St, City, Country',
    },
    {
      id: '2',
      productName: 'Dark Stout',
      quantity: 30,
      totalPrice: 179.70,
      orderDate: '2024-03-14T15:45:00Z',
      status: 'processing',
      deliveryAddress: '456 Oak Ave, City, Country',
    },
    {
      id: '3',
      productName: 'Summer Ale',
      quantity: 25,
      totalPrice: 112.25,
      orderDate: '2024-03-13T09:15:00Z',
      status: 'pending',
      deliveryAddress: '789 Pine Rd, City, Country',
    },
  ];

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      header: 'Order Date',
      accessor: (order: Order) => (
        <span>
          {new Date(order.orderDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    { header: 'Product', accessor: 'productName' as const },
    {
      header: 'Quantity',
      accessor: (order: Order) => (
        <span className="font-medium">{order.quantity}</span>
      ),
    },
    {
      header: 'Total',
      accessor: (order: Order) => (
        <span className="font-medium">${order.totalPrice.toFixed(2)}</span>
      ),
      className: 'text-right',
    },
    {
      header: 'Status',
      accessor: (order: Order) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
            order.status
          )}`}
        >
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      ),
    },
  ];

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
        <p className="text-sm text-gray-500">
          Click on an order to view more details
        </p>
      </div>

      <DataTable
        columns={columns}
        data={mockOrders}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-gray-900">
                Order Details
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Order ID
                </label>
                <p className="mt-1">{selectedOrder.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Product
                </label>
                <p className="mt-1">{selectedOrder.productName}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Quantity
                </label>
                <p className="mt-1">{selectedOrder.quantity} units</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Total Price
                </label>
                <p className="mt-1">${selectedOrder.totalPrice.toFixed(2)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Delivery Address
                </label>
                <p className="mt-1">{selectedOrder.deliveryAddress}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <p className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status.charAt(0).toUpperCase() +
                      selectedOrder.status.slice(1)}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
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