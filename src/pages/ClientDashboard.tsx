import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Client Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="ml-4 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Order History */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Order History</h3>
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
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
            </div>

            {/* Current Order Status */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Current Order</h3>
                <div className="mt-5">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order #123</p>
                        <p className="text-sm text-gray-500">Estimated delivery: Tomorrow</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In Transit
                      </span>
                    </div>
                    <div className="mt-6">
                      <div className="relative">
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                          <div className="w-2/3 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 