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

      {/* Enhanced Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#BE202E] to-[#9A1B24]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white font-sansation">
                  Order Details: #{selectedOrder.id}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column - Order Information */}
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 01-1 1H8a1 1 0 110-2h4a1 1 0 011 1zm-1 4a1 1 0 100-2H8a1 1 0 100 2h4z" clipRule="evenodd"/>
                      </svg>
                      Order Information
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                        <span className="text-sm font-medium text-gray-700">Order ID:</span>
                        <span className="text-blue-900 font-mono">{selectedOrder.id}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                        <span className="text-sm font-medium text-gray-700">Product:</span>
                        <span className="text-blue-900 font-medium">{selectedOrder.productName}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                        <span className="text-sm font-medium text-gray-700">Quantity:</span>
                        <span className="text-blue-900 font-medium">{selectedOrder.quantity} units</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                        <span className="text-sm font-medium text-gray-700">Unit Price:</span>
                        <span className="text-blue-900 font-medium">{formatUSD(selectedOrder.totalPrice / selectedOrder.quantity)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-700">Total Price:</span>
                        <span className="text-xl font-bold text-blue-900">{formatUSD(selectedOrder.totalPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Timeline */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                      Order Timeline
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-green-900">Order Placed</div>
                          <div className="text-xs text-green-700">{new Date(selectedOrder.orderDate).toLocaleDateString()} at {new Date(selectedOrder.orderDate).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      
                      {selectedOrder.status !== 'pending' && (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-blue-900">Order Confirmed</div>
                            <div className="text-xs text-blue-700">Processing started</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.status === 'delivered' && (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-3 h-3 bg-green-600 rounded-full"></div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-green-900">Order Delivered</div>
                            <div className="text-xs text-green-700">Successfully delivered to customer</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.status === 'cancelled' && (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-red-900">Order Cancelled</div>
                            <div className="text-xs text-red-700">Order was cancelled</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Status & Delivery */}
                <div className="space-y-6">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Current Status
                    </h4>
                    
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                        selectedOrder.status === 'delivered' ? 'bg-green-100' :
                        selectedOrder.status === 'processing' ? 'bg-blue-100' :
                        selectedOrder.status === 'pending' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }">
                        {selectedOrder.status === 'delivered' ? (
                          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        ) : selectedOrder.status === 'processing' ? (
                          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                          </svg>
                        ) : selectedOrder.status === 'pending' ? (
                          <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                      
                      <span className={`inline-flex px-4 py-2 text-sm font-medium rounded-full ${getOrderStatusClass(selectedOrder.status)}`}>
                        {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                      </span>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        {selectedOrder.status === 'delivered' && 'Your order has been successfully delivered!'}
                        {selectedOrder.status === 'processing' && 'Your order is being prepared for delivery.'}
                        {selectedOrder.status === 'pending' && 'Your order is waiting to be processed.'}
                        {selectedOrder.status === 'cancelled' && 'This order has been cancelled.'}
                      </div>
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      Delivery Information
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-orange-700 mb-1">Delivery Address</label>
                        <div className="bg-white p-3 rounded-md border border-orange-200">
                          <p className="text-orange-900">{selectedOrder.deliveryAddress}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-orange-700 mb-1">Order Date</label>
                          <div className="bg-white p-2 rounded-md border border-orange-200">
                            <p className="text-sm text-orange-900">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-orange-700 mb-1">Order Time</label>
                          <div className="bg-white p-2 rounded-md border border-orange-200">
                            <p className="text-sm text-orange-900">{new Date(selectedOrder.orderDate).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>

                      {selectedOrder.status === 'processing' && (
                        <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
                          <div className="flex">
                            <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                            </svg>
                            <div>
                              <h3 className="text-sm font-medium text-blue-800">Estimated Delivery</h3>
                              <p className="text-sm text-blue-700 mt-1">2-3 business days from order confirmation</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Order placed on {new Date(selectedOrder.orderDate).toLocaleDateString()}
                </div>
                <div className="flex space-x-3">
                  {selectedOrder.status === 'delivered' && (
                    <button
                      onClick={() => {
                        // TODO: Implement reorder functionality
                        alert('Reorder functionality coming soon!');
                      }}
                      className="px-4 py-2 bg-[#BE202E] text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
                    >
                      Order Again
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryList; 