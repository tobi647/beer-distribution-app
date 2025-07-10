import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { showToast } from '../../utils/toast';
import DataTable from '../DataTable';

interface BeerStock {
  id: string;
  name: string;
  type: string;
  quantity: number;
  baseCost: number;
  shippingCost: number;
  additionalCosts: number;
  markup: number;
  isMarkupPercentage: boolean;
  totalCost: number;
  sellingPrice: number;
  available: boolean;
  minimumStock: number;
  supplier: string;
}

interface StockFormData {
  name: string;
  type: string;
  quantity: number;
  baseCost: number;
  shippingCost: number;
  additionalCosts: number;
  markup: number;
  isMarkupPercentage: boolean;
  minimumStock: number;
  supplier: string;
}

type SortField = 'name' | 'type' | 'quantity' | 'baseCost' | 'totalCost' | 'sellingPrice' | 'minimumStock';
type SortOrder = 'asc' | 'desc';

const calculateTotalCost = (baseCost: number, shippingCost: number, additionalCosts: number): number => {
  return baseCost + shippingCost + additionalCosts;
};

const calculateSellingPrice = (totalCost: number, markup: number, isMarkupPercentage: boolean): number => {
  return isMarkupPercentage ? totalCost * (1 + markup / 100) : totalCost + markup;
};

interface Column {
  header: string;
  accessor: ((stock: BeerStock) => React.ReactNode) | keyof BeerStock;
  className?: string;
  sortable?: boolean;
  sortField?: SortField;
}

const StockManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stocks, setStocks] = useState<BeerStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<BeerStock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'name',
    order: 'asc',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<StockFormData>({
    defaultValues: {
      name: '',
      type: '',
      quantity: 0,
      baseCost: 0,
      shippingCost: 0,
      additionalCosts: 0,
      markup: 0,
      isMarkupPercentage: false,
      minimumStock: 0,
      supplier: '',
    },
  });

  // Mock data
  const mockStocks: BeerStock[] = [
    {
      id: '1',
      name: 'Pilsner Premium',
      type: 'Pilsner',
      quantity: 150,
      baseCost: 2.50,
      shippingCost: 0.50,
      additionalCosts: 0.20,
      markup: 1.00,
      isMarkupPercentage: false,
      totalCost: 3.20,
      sellingPrice: 4.99,
      available: true,
      minimumStock: 50,
      supplier: 'Premium Breweries Ltd',
    },
    {
      id: '2',
      name: 'Dark Stout',
      type: 'Stout',
      quantity: 85,
      baseCost: 3.00,
      shippingCost: 0.75,
      additionalCosts: 0.30,
      markup: 1.50,
      isMarkupPercentage: false,
      totalCost: 4.05,
      sellingPrice: 5.99,
      available: true,
      minimumStock: 30,
      supplier: 'Craft Beer Co.',
    },
    {
      id: '3',
      name: 'Summer Ale',
      type: 'Ale',
      quantity: 0,
      baseCost: 2.00,
      shippingCost: 0.25,
      additionalCosts: 0.10,
      markup: 0.50,
      isMarkupPercentage: false,
      totalCost: 2.35,
      sellingPrice: 4.49,
      available: false,
      minimumStock: 40,
      supplier: 'Seasonal Brews Inc',
    },
  ];

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setStocks(mockStocks);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = async (data: StockFormData) => {
    const loadingToastId = showToast.loading('Saving changes...');
    
    try {
      const totalCost = calculateTotalCost(data.baseCost, data.shippingCost, data.additionalCosts);
      const sellingPrice = calculateSellingPrice(totalCost, data.markup, data.isMarkupPercentage);

      if (isEditing && selectedStock) {
        // TODO: Implement update API call
        setStocks((prev) =>
          prev.map((stock) =>
            stock.id === selectedStock.id
              ? {
                  ...stock,
                  ...data,
                  totalCost,
                  sellingPrice,
                  available: data.quantity > 0,
                }
              : stock
          )
        );
        showToast.update(loadingToastId, 'Stock updated successfully!', 'success');
      } else {
        // TODO: Implement create API call
        const newStock: BeerStock = {
          id: Date.now().toString(), // Temporary ID generation
          ...data,
          totalCost,
          sellingPrice,
          available: data.quantity > 0,
        };
        setStocks((prev) => [...prev, newStock]);
        showToast.update(loadingToastId, 'New stock added successfully!', 'success');
      }

      closeModal();
    } catch (error) {
      console.error('Error saving stock:', error);
      showToast.update(loadingToastId, 'Failed to save stock. Please try again.', 'error');
    }
  };

  const handleEdit = (stock: BeerStock) => {
    setSelectedStock(stock);
    setIsEditing(true);
    // Set form values
    Object.entries(stock).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'available') {
        setValue(key as keyof StockFormData, value);
      }
    });
    setIsModalOpen(true);
    showToast.info('Editing stock item...', { autoClose: 2000 });
  };

  const handleSort = (field: keyof BeerStock) => {
    if (field === 'baseCost' || field === 'totalCost' || field === 'sellingPrice' || 
        field === 'name' || field === 'type' || field === 'quantity' || field === 'minimumStock') {
      setSortConfig((prev) => ({
        field: field as SortField,
        order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
      }));
    }
  };

  const sortedAndFilteredStocks = useMemo(() => {
    let filtered = stocks;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = stocks.filter(
        (stock) =>
          stock.name.toLowerCase().includes(searchLower) ||
          stock.type.toLowerCase().includes(searchLower) ||
          stock.supplier.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortConfig.order === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [stocks, searchTerm, sortConfig]);

  const handleDelete = async (stock: BeerStock) => {
    const confirmDelete = () => {
      const loadingToastId = showToast.loading('Deleting stock...');

      try {
        // TODO: Implement delete API call
        setStocks((prev) => prev.filter((s) => s.id !== stock.id));
        showToast.update(loadingToastId, 'Stock deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting stock:', error);
        showToast.update(
          loadingToastId,
          'Failed to delete stock. Please try again.',
          'error'
        );
      }
    };

    // Show warning toast with action buttons
    showToast.warning(
      <div className="flex flex-col gap-2">
        <p>Are you sure you want to delete "{stock.name}"?</p>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={confirmDelete}
            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Delete
          </button>
          <button
            onClick={() => showToast.dismiss()}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
      }
    );
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStock(null);
    setIsEditing(false);
    reset();
  };

  const columns: Column[] = [
    {
      header: 'Name',
      accessor: 'name' as const,
      sortable: true,
      className: 'min-w-[200px]',
    },
    {
      header: 'Type',
      accessor: 'type' as const,
      sortable: true,
    },
    {
      header: 'Quantity',
      accessor: (stock: BeerStock) => (
        <div className="flex flex-col">
          <span
            className={`font-medium ${
              stock.quantity <= stock.minimumStock
                ? 'text-red-600'
                : 'text-gray-900'
            }`}
          >
            {stock.quantity}
          </span>
          {stock.quantity <= stock.minimumStock && (
            <span className="text-xs text-red-600">
              Below minimum ({stock.minimumStock})
            </span>
          )}
        </div>
      ),
      sortable: true,
      sortField: 'quantity' as const,
    },
    {
      header: 'Base Cost',
      accessor: (stock: BeerStock) => (
        <span className="font-medium">${stock.baseCost.toFixed(2)}</span>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'baseCost' as const,
    },
    {
      header: 'Total Cost',
      accessor: (stock: BeerStock) => (
        <span className="font-medium">${stock.totalCost.toFixed(2)}</span>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'totalCost' as const,
    },
    {
      header: 'Selling Price',
      accessor: (stock: BeerStock) => (
        <span className="font-medium">${stock.sellingPrice.toFixed(2)}</span>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'sellingPrice' as const,
    },
    {
      header: 'Profit Margin',
      accessor: (stock: BeerStock) => {
        const margin = ((stock.sellingPrice - stock.totalCost) / stock.totalCost * 100).toFixed(1);
        return <span className="font-medium">{margin}%</span>;
      },
      className: 'text-right',
    },
    {
      header: 'Status',
      accessor: (stock: BeerStock) => (
        <div className="flex flex-col gap-1">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              stock.available
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {stock.available ? 'In Stock' : 'Out of Stock'}
          </span>
          <span className="text-xs text-gray-500">
            Min. Stock: {stock.minimumStock}
          </span>
        </div>
      ),
    },
    {
      header: 'Supplier',
      accessor: 'supplier' as const,
      sortable: true,
    },
    {
      header: 'Actions',
      accessor: (stock: BeerStock) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(stock)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 hover:border-blue-800 rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(stock)}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-600 hover:border-red-800 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Stock Management</h3>
          <p className="text-sm text-gray-500">
            Manage your beer inventory and prices
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add New Stock
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, type, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {sortedAndFilteredStocks.length} items
              </span>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={sortedAndFilteredStocks}
          isLoading={isLoading}
          onSort={handleSort}
          sortConfig={sortConfig}
        />
      </div>

      {/* Stock Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditing ? 'Edit Stock' : 'Add New Stock'}
              </h3>
              <button
                onClick={closeModal}
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Type
                </label>
                <select
                  {...register('type', { required: 'Type is required' })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.type
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select a type</option>
                  <option value="Pilsner">Pilsner</option>
                  <option value="Stout">Stout</option>
                  <option value="Ale">Ale</option>
                  <option value="Lager">Lager</option>
                  <option value="IPA">IPA</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Quantity
                </label>
                <input
                  type="number"
                  {...register('quantity', {
                    required: 'Quantity is required',
                    min: { value: 0, message: 'Quantity cannot be negative' },
                    valueAsNumber: true,
                  })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.quantity
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="baseCost"
                  className="block text-sm font-medium text-gray-700"
                >
                  Base Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('baseCost', {
                    required: 'Base cost is required',
                    min: { value: 0, message: 'Base cost must be greater than 0' },
                    valueAsNumber: true,
                  })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.baseCost
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.baseCost && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.baseCost.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="shippingCost"
                  className="block text-sm font-medium text-gray-700"
                >
                  Shipping Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('shippingCost', {
                    required: 'Shipping cost is required',
                    min: { value: 0, message: 'Shipping cost must be greater than 0' },
                    valueAsNumber: true,
                  })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.shippingCost
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.shippingCost && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.shippingCost.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="additionalCosts"
                  className="block text-sm font-medium text-gray-700"
                >
                  Additional Costs ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('additionalCosts', {
                    required: 'Additional costs are required',
                    min: { value: 0, message: 'Additional costs must be greater than 0' },
                    valueAsNumber: true,
                  })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.additionalCosts
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.additionalCosts && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.additionalCosts.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="markup"
                  className="block text-sm font-medium text-gray-700"
                >
                  Markup ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('markup', {
                    required: 'Markup is required',
                    min: { value: 0, message: 'Markup must be greater than 0' },
                    valueAsNumber: true,
                  })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.markup
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.markup && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.markup.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="isMarkupPercentage"
                  className="flex items-center"
                >
                  <input
                    type="checkbox"
                    {...register('isMarkupPercentage')}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Markup is a percentage
                  </span>
                </label>
              </div>

              <div>
                <label
                  htmlFor="minimumStock"
                  className="block text-sm font-medium text-gray-700"
                >
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  {...register('minimumStock', {
                    required: 'Minimum stock is required',
                    min: { value: 0, message: 'Minimum stock cannot be negative' },
                    valueAsNumber: true,
                  })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.minimumStock
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.minimumStock && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.minimumStock.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="supplier"
                  className="block text-sm font-medium text-gray-700"
                >
                  Supplier
                </label>
                <input
                  type="text"
                  {...register('supplier', { required: 'Supplier is required' })}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    errors.supplier
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.supplier && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.supplier.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isEditing ? 'Update Stock' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager; 