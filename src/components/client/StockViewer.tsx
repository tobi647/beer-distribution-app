import { useState, useEffect } from 'react';
import DataTable from '../DataTable';

interface BeerStock {
  id: string;
  name: string;
  type: string;
  quantity: number;
  sellingPrice: number;
  available: boolean;
}

interface StockViewerProps {
  onProductSelect: (product: { id: string; name: string; price: number }) => void;
}

const StockViewer = ({ onProductSelect }: StockViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // TODO: Replace with actual API call
  const mockData: BeerStock[] = [
    {
      id: '1',
      name: 'Pilsner Premium',
      type: 'Pilsner',
      quantity: 150,
      sellingPrice: 4.99,
      available: true,
    },
    {
      id: '2',
      name: 'Dark Stout',
      type: 'Stout',
      quantity: 85,
      sellingPrice: 5.99,
      available: true,
    },
    {
      id: '3',
      name: 'Summer Ale',
      type: 'Ale',
      quantity: 0,
      sellingPrice: 4.49,
      available: false,
    },
  ];

  // Simulate API call
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const columns = [
    { header: 'Name', accessor: 'name' as const },
    { header: 'Type', accessor: 'type' as const },
    {
      header: 'Status',
      accessor: (item: BeerStock) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            item.available
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {item.available ? 'In Stock' : 'Out of Stock'}
        </span>
      ),
    },
    {
      header: 'Price',
      accessor: (item: BeerStock) => (
        <span className="font-medium">${item.sellingPrice.toFixed(2)}</span>
      ),
      className: 'text-right',
    },
  ];

  const handleRowClick = (item: BeerStock) => {
    if (item.available) {
      onProductSelect({
        id: item.id,
        name: item.name,
        price: item.sellingPrice,
      });
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Available Products</h3>
          <p className="text-sm text-gray-500">
            Click on a product to place an order
          </p>
        </div>
        <button
          onClick={() => setIsLoading(true)} // Simulated refresh
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>
      
      <DataTable
        columns={columns}
        data={mockData}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />
    </div>
  );
};

export default StockViewer; 