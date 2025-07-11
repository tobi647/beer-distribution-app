import { useState, useEffect } from 'react';
import { formatUSD } from '../../utils/calculations';
import { mockClientStocks, type BeerStock, MOCK_API_DELAY } from '../../constants/mockData';
import DataTable from '../DataTable';

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
}

interface StockViewerProps {
  onProductSelect: (product: SelectedProduct) => void;
}

const StockViewer = ({ onProductSelect }: StockViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Load mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, MOCK_API_DELAY);
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
        <span className="font-medium">{formatUSD(item.sellingPrice)}</span>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-sansation">Available Stock</h2>
        <p className="text-gray-600 font-gotham">
          Click on any available product to place an order
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <DataTable
          columns={columns}
          data={mockClientStocks}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      </div>

      {!isLoading && mockClientStocks.filter(item => item.available).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No products are currently available for order.</p>
        </div>
      )}
    </div>
  );
};

export default StockViewer; 