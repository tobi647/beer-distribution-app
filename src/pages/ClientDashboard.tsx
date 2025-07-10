import { useNavigate } from 'react-router-dom';
import OrderForm from '../components/OrderForm';

export default function ClientDashboard() {
  const navigate = useNavigate();

  const handleOrderSubmit = (orderData: {
    beerType: string;
    quantity: number;
    deliveryAddress: string;
    notes: string;
  }) => {
    // TODO: Implement order submission logic
    console.log('New order:', orderData);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-gentle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-sansation">Client Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Order History */}
            <div className="card">
              <h3 className="text-lg font-gotham-bold">Order History</h3>
              <div className="mt-5">
                <div className="flow-root">
                  <ul className="-my-4 divide-y divide-gray-200">
                    {[1, 2, 3].map((order) => (
                      <li key={order} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              Order #{order}
                            </p>
                            <p className="text-sm text-gray-500">
                              Placed on {new Date().toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="status-badge-primary">
                              Delivered
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Order Status */}
            <div className="card">
              <h3 className="text-lg font-gotham-bold">Current Order</h3>
              <div className="mt-5">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Order #123</p>
                      <p className="text-sm text-gray-500">Estimated delivery: Tomorrow</p>
                    </div>
                    <span className="status-badge-primary">
                      In Transit
                    </span>
                  </div>
                  <div className="mt-6">
                    <div className="relative">
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                        <div className="w-2/3 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-bauhinia"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Order Form */}
          <div className="mt-6">
            <div className="card">
              <h3 className="text-lg mb-4 font-gotham-bold">Place New Order</h3>
              <OrderForm onSubmit={handleOrderSubmit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 