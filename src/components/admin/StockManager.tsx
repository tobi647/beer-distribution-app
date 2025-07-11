import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { showToast } from '../../utils/toast';
import { 
  formatPeso, 
  calculateTotalCost, 
  calculateSellingPrice, 
  calculateProfitMargin,
  calculateWeightedAverageCost,
  roundToDecimal,
  safeNumber,
  generateId
} from '../../utils/calculations';
import { mockAdminStocks, type BeerStock, type SupplyEntry, MOCK_API_DELAY } from '../../constants/mockData';
import DataTable from '../DataTable';

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
  sellingPrice: number;
  isPriceLocked: boolean;
}

interface AddSupplyFormData {
  quantity: number;
  baseCost: number;
  shippingCost: number;
  additionalCosts: number;
  notes?: string;
  supplier?: string;
}

type SortField = 'name' | 'type' | 'quantity' | 'baseCost' | 'totalCost' | 'sellingPrice' | 'minimumStock';
type SortOrder = 'asc' | 'desc';

interface Column {
  header: string;
  accessor: ((stock: BeerStock) => React.ReactNode) | keyof BeerStock;
  className?: string;
  sortable?: boolean;
  sortField?: SortField;
}

const StockManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stocks, setStocks] = useState<Required<BeerStock>[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'name',
    order: 'asc',
  });
  const [selectedStock, setSelectedStock] = useState<Required<BeerStock> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddSupplyModalOpen, setIsAddSupplyModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
    clearErrors,
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
      sellingPrice: 0,
      isPriceLocked: false,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  });

  const {
    register: registerSupply,
    handleSubmit: handleSubmitSupply,
    reset: resetSupply,
    formState: { errors: supplyErrors },
    clearErrors: clearSupplyErrors,
  } = useForm<AddSupplyFormData>({
    defaultValues: {
      quantity: 0,
      baseCost: 0,
      shippingCost: 0,
      additionalCosts: 0,
    },
    mode: 'onSubmit',
    shouldFocusError: false,
  });

  // Load mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      setStocks(mockAdminStocks);
      setIsLoading(false);
    }, MOCK_API_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Memoize sorted and filtered stocks
  const sortedAndFilteredStocks = useMemo(() => {
    let filtered = stocks;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = stocks.filter(
        (stock) =>
          stock.name.toLowerCase().includes(searchLower) ||
          stock.type.toLowerCase().includes(searchLower) ||
          (stock.supplier || '').toLowerCase().includes(searchLower)
      );
    }

    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.order === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  }, [stocks, searchTerm, sortConfig]);

  // Form values and calculations
  const formValues = watch();
  
  const totalCost = useMemo(() => {
    return calculateTotalCost(
      safeNumber(formValues.baseCost),
      safeNumber(formValues.shippingCost),
      safeNumber(formValues.additionalCosts)
    );
  }, [formValues.baseCost, formValues.shippingCost, formValues.additionalCosts]);

  const calculatedSellingPrice = useMemo(() => {
    if (formValues.isPriceLocked) {
      return safeNumber(formValues.sellingPrice);
    }
    
    return calculateSellingPrice(
      totalCost,
      safeNumber(formValues.markup),
      formValues.isMarkupPercentage
    );
  }, [totalCost, formValues.markup, formValues.isMarkupPercentage, formValues.isPriceLocked, formValues.sellingPrice]);

  // Update selling price when calculations change (only when price is not locked)
  useEffect(() => {
    if (!formValues.isPriceLocked && isModalOpen) {
      setValue('sellingPrice', roundToDecimal(calculatedSellingPrice));
    }
  }, [calculatedSellingPrice, formValues.isPriceLocked, isModalOpen, setValue]);

  const handleEdit = (stock: Required<BeerStock>) => {
    setSelectedStock(stock);
    setIsEditing(true);
    clearErrors();
    reset({
      name: stock.name,
      type: stock.type,
      quantity: stock.quantity,
      baseCost: stock.baseCost,
      shippingCost: stock.shippingCost,
      additionalCosts: stock.additionalCosts,
      markup: stock.markup,
      isMarkupPercentage: stock.isMarkupPercentage,
      minimumStock: stock.minimumStock,
      supplier: stock.supplier,
      sellingPrice: stock.sellingPrice,
      isPriceLocked: stock.isPriceLocked,
    });
    setIsModalOpen(true);
  };

  const handleAddSupply = (stock: Required<BeerStock>) => {
    setSelectedStock(stock);
    clearSupplyErrors();
    setIsAddSupplyModalOpen(true);
  };

  const handleViewHistory = (stock: Required<BeerStock>) => {
    setSelectedStock(stock);
    setIsHistoryModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStock(null);
    setIsEditing(false);
    clearErrors();
    reset();
  };

  const onSubmit = async (data: StockFormData) => {
    try {
      const loadingToastId = showToast.loading('Saving changes...');
      
      // Process form data with safe number conversion
      const processedData = {
        ...data,
        quantity: safeNumber(data.quantity),
        baseCost: safeNumber(data.baseCost),
        shippingCost: safeNumber(data.shippingCost),
        additionalCosts: safeNumber(data.additionalCosts),
        markup: safeNumber(data.markup),
        minimumStock: safeNumber(data.minimumStock),
        sellingPrice: safeNumber(data.sellingPrice),
      };

      // Calculate final values using utility functions
      const finalTotalCost = calculateTotalCost(
        processedData.baseCost,
        processedData.shippingCost,
        processedData.additionalCosts
      );
      
      const finalSellingPrice = processedData.isPriceLocked
        ? processedData.sellingPrice
        : calculateSellingPrice(finalTotalCost, processedData.markup, processedData.isMarkupPercentage);

      const updatedData: Required<BeerStock> = {
        id: selectedStock?.id || generateId(),
        ...processedData,
        totalCost: finalTotalCost,
        sellingPrice: roundToDecimal(finalSellingPrice),
        available: processedData.quantity > 0,
        supplyHistory: selectedStock?.supplyHistory || [],
      };

      if (isEditing && selectedStock) {
        setStocks((prev) =>
          prev.map((stock) =>
            stock.id === selectedStock.id ? updatedData : stock
          )
        );
        showToast.update(loadingToastId, 'Stock updated successfully!', 'success');
      } else {
        setStocks((prev) => [...prev, updatedData]);
        showToast.update(loadingToastId, 'New stock added successfully!', 'success');
      }

      closeModal();
    } catch (error) {
      console.error('Error saving stock:', error);
      showToast.error('Failed to save stock. Please try again.');
    }
  };

  const handleAddSupplySubmit = async (data: AddSupplyFormData) => {
    if (!selectedStock) return;

    const loadingToastId = showToast.loading('Adding supply...');
    
    try {
      // Convert and validate input data
      const quantity = safeNumber(data.quantity);
      const baseCost = safeNumber(data.baseCost);
      const shippingCost = safeNumber(data.shippingCost);
      const additionalCosts = safeNumber(data.additionalCosts);
      
      const newSupplyTotalCost = calculateTotalCost(baseCost, shippingCost, additionalCosts);
      const newAverageCost = calculateWeightedAverageCost(
        selectedStock.quantity,
        selectedStock.totalCost,
        quantity,
        newSupplyTotalCost
      );
      const roundedAverageCost = roundToDecimal(newAverageCost);
      const combinedQuantity = selectedStock.quantity + quantity;

      const supplyEntry: SupplyEntry = {
        id: generateId(),
        date: new Date().toISOString(),
        quantity,
        baseCost,
        shippingCost,
        additionalCosts,
        totalCost: newSupplyTotalCost,
        notes: data.notes,
        supplier: data.supplier || selectedStock.supplier,
        profitMargin: calculateProfitMargin(selectedStock.sellingPrice, roundedAverageCost),
        priceChange: 0,
        averageCostChange: roundedAverageCost - selectedStock.totalCost,
        wasAutoCalculated: true,
        priceLockChanged: false,
      };

      // Calculate new selling price if not locked
      let newSellingPrice = selectedStock.sellingPrice;
      if (!selectedStock.isPriceLocked) {
        newSellingPrice = calculateSellingPrice(
          roundedAverageCost,
          selectedStock.markup,
          selectedStock.isMarkupPercentage
        );
        newSellingPrice = roundToDecimal(newSellingPrice);
      }

      setStocks((prev) =>
        prev.map((stock) =>
          stock.id === selectedStock.id
            ? {
                ...stock,
                quantity: combinedQuantity,
                baseCost: roundedAverageCost,
                totalCost: roundedAverageCost,
                sellingPrice: newSellingPrice,
                available: true,
                supplyHistory: [supplyEntry, ...stock.supplyHistory],
              }
            : stock
        )
      );

      showToast.update(loadingToastId, `Successfully added ${quantity} units`, 'success');
      setIsAddSupplyModalOpen(false);
      clearSupplyErrors();
      resetSupply();
    } catch (error) {
      console.error('Error adding supply:', error);
      showToast.update(loadingToastId, 'Failed to add supply', 'error');
    }
  };

  const handlePriceLockToggle = (stock: Required<BeerStock>, newLockState: boolean) => {
    const loadingToastId = showToast.loading(newLockState ? 'Locking price...' : 'Unlocking price...');
    
    try {
      setStocks((prev) =>
        prev.map((s) =>
          s.id === stock.id ? { ...s, isPriceLocked: newLockState } : s
        )
      );

      showToast.update(
        loadingToastId,
        newLockState
          ? `Price locked at ${formatPeso(stock.sellingPrice)}`
          : `Price unlocked for ${stock.name}`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling price lock:', error);
      showToast.update(loadingToastId, 'Failed to toggle price lock', 'error');
    }
  };

  const handleSort = (field: keyof BeerStock) => {
    const validSortFields: SortField[] = ['name', 'type', 'quantity', 'baseCost', 'totalCost', 'sellingPrice', 'minimumStock'];
    if (validSortFields.includes(field as SortField)) {
      setSortConfig((prev) => ({
        field: field as SortField,
        order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
      }));
    }
  };

  const handleDelete = async (stock: Required<BeerStock>) => {
    if (window.confirm(`Are you sure you want to delete "${stock.name}"?`)) {
      const loadingToastId = showToast.loading('Deleting stock...');

      try {
        setStocks((prev) => prev.filter((s) => s.id !== stock.id));
        showToast.update(loadingToastId, `${stock.name} deleted successfully`, 'success');
      } catch (error) {
        console.error('Error deleting stock:', error);
        showToast.update(loadingToastId, 'Failed to delete stock', 'error');
      }
    }
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
              stock.quantity <= (stock.minimumStock || 0)
                ? 'text-red-600'
                : 'text-gray-900'
            }`}
          >
            {stock.quantity}
          </span>
          {stock.quantity <= (stock.minimumStock || 0) && (
            <span className="text-xs text-red-600">
              Below minimum ({stock.minimumStock || 0})
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
        <span className="font-medium">{formatPeso(stock.baseCost || 0)}</span>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'baseCost' as const,
    },
    {
      header: 'Total Cost',
      accessor: (stock: BeerStock) => (
        <span className="font-medium">{formatPeso(stock.totalCost || 0)}</span>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'totalCost' as const,
    },
    {
      header: 'Selling Price',
      accessor: (stock: BeerStock) => (
        <div className="flex items-center justify-end space-x-2">
          <span className="font-medium">{formatPeso(stock.sellingPrice)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePriceLockToggle(stock as Required<BeerStock>, !(stock.isPriceLocked || false));
            }}
            className={`p-1 rounded ${
              stock.isPriceLocked
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={stock.isPriceLocked ? 'Price locked' : 'Price unlocked'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              {stock.isPriceLocked ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h16.5A2.25 2.25 0 0022.5 19.5v-7.5a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v7.5a2.25 2.25 0 002.25 2.25z"
                />
              )}
            </svg>
          </button>
        </div>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'sellingPrice' as const,
    },
    {
      header: 'Profit Margin',
      accessor: (stock: BeerStock) => {
        const margin = calculateProfitMargin(stock.sellingPrice, stock.totalCost || 0);
        return (
          <span
            className={`font-medium ${
              margin > 20
                ? 'text-green-600'
                : margin >= 10
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {margin.toFixed(1)}%
          </span>
        );
      },
      className: 'text-right',
    },
    {
      header: 'Actions',
      accessor: (stock: BeerStock) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddSupply(stock as Required<BeerStock>);
            }}
            className="p-1.5 text-gray-600 hover:text-[#BE202E] hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="Add supply"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(stock as Required<BeerStock>);
            }}
            className="p-1.5 text-gray-600 hover:text-[#BE202E] hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="Edit stock"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewHistory(stock as Required<BeerStock>);
            }}
            className="p-1.5 text-gray-600 hover:text-[#BE202E] hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="View history"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(stock as Required<BeerStock>);
            }}
            className="p-1.5 text-gray-600 hover:text-[#BE202E] hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="Delete stock"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 font-sansation">Stock Management</h2>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setIsEditing(false);
            setSelectedStock(null);
          }}
          className="px-4 py-2 bg-[#BE202E] text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-gotham"
        >
          Add New Stock
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search stocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#BE202E] focus:border-transparent outline-none font-gotham"
        />
        <span className="absolute right-3 top-2.5 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </span>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <DataTable
          columns={columns}
          data={sortedAndFilteredStocks}
          isLoading={isLoading}
          onSort={handleSort}
          sortConfig={sortConfig}
        />
      </div>

      {/* Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 font-sansation">
                {isEditing ? 'Edit Stock' : 'Add New Stock'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beer Name
                  </label>
                  <input
                    {...register('name', { required: 'Beer name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                    placeholder="Enter beer name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    {...register('type', { required: 'Type is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                  >
                    <option value="">Select type</option>
                    <option value="Lager">Lager</option>
                    <option value="IPA">IPA</option>
                    <option value="Ale">Ale</option>
                    <option value="Stout">Stout</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Pilsner">Pilsner</option>
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    {...register('quantity', {
                      required: 'Quantity is required',
                      min: { value: 0, message: 'Quantity must be non-negative' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                    placeholder="0"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Cost (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('baseCost', {
                      required: 'Base cost is required',
                      min: { value: 0, message: 'Base cost must be non-negative' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                    placeholder="0.00"
                  />
                  {errors.baseCost && (
                    <p className="mt-1 text-sm text-red-600">{errors.baseCost.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipping Cost (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('shippingCost', {
                      min: { value: 0, message: 'Shipping cost must be non-negative' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                    placeholder="0.00"
                  />
                  {errors.shippingCost && (
                    <p className="mt-1 text-sm text-red-600">{errors.shippingCost.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Costs (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('additionalCosts', {
                      min: { value: 0, message: 'Additional costs must be non-negative' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                    placeholder="0.00"
                  />
                  {errors.additionalCosts && (
                    <p className="mt-1 text-sm text-red-600">{errors.additionalCosts.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Markup
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      {...register('markup', {
                        required: 'Markup is required',
                        min: { value: 0, message: 'Markup must be non-negative' },
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                      placeholder="0.00"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('isMarkupPercentage')}
                        className="mr-2"
                      />
                      <span className="text-sm">%</span>
                    </label>
                  </div>
                  {errors.markup && (
                    <p className="mt-1 text-sm text-red-600">{errors.markup.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    {...register('minimumStock', {
                      required: 'Minimum stock is required',
                      min: { value: 0, message: 'Minimum stock must be non-negative' },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                    placeholder="0"
                  />
                  {errors.minimumStock && (
                    <p className="mt-1 text-sm text-red-600">{errors.minimumStock.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                  </label>
                  <input
                    {...register('supplier', { required: 'Supplier is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                    placeholder="Enter supplier name"
                  />
                  {errors.supplier && (
                    <p className="mt-1 text-sm text-red-600">{errors.supplier.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selling Price (₱)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      {...register('sellingPrice', {
                        required: 'Selling price is required',
                        min: { value: 0, message: 'Selling price must be non-negative' },
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                      placeholder="0.00"
                      readOnly={!formValues.isPriceLocked}
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('isPriceLocked')}
                        className="mr-2"
                      />
                      <span className="text-sm">Lock</span>
                    </label>
                  </div>
                  {errors.sellingPrice && (
                    <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-md p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Total Cost:</span>
                    <span className="ml-2 text-gray-900">{formatPeso(totalCost)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Calculated Price:</span>
                    <span className="ml-2 text-gray-900">{formatPeso(calculatedSellingPrice)}</span>
                  </div>
                  {!formValues.isPriceLocked && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {formValues.isMarkupPercentage 
                          ? `${formatPeso(totalCost)} + ${Number(formValues.markup) || 0}% = ${formatPeso(calculatedSellingPrice)}`
                          : `${formatPeso(totalCost)} + ${formatPeso(Number(formValues.markup) || 0)} = ${formatPeso(calculatedSellingPrice)}`
                        }
                      </span>
                    </div>
                  )}
                  {formValues.isPriceLocked && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-amber-600 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Price is locked - automatic calculation disabled
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#BE202E] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  {isEditing ? 'Update Stock' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supply Modal */}
      {isAddSupplyModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 font-sansation">
                Add Supply - {selectedStock.name}
              </h3>
            </div>
            
            <form onSubmit={handleSubmitSupply(handleAddSupplySubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  {...registerSupply('quantity', {
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be at least 1' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                  placeholder="Enter quantity"
                />
                {supplyErrors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{supplyErrors.quantity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Cost per Unit (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...registerSupply('baseCost', {
                    required: 'Base cost is required',
                    min: { value: 0, message: 'Base cost must be non-negative' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                  placeholder="0.00"
                />
                {supplyErrors.baseCost && (
                  <p className="mt-1 text-sm text-red-600">{supplyErrors.baseCost.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Cost per Unit (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...registerSupply('shippingCost', {
                    min: { value: 0, message: 'Shipping cost must be non-negative' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                  placeholder="0.00"
                />
                {supplyErrors.shippingCost && (
                  <p className="mt-1 text-sm text-red-600">{supplyErrors.shippingCost.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Costs per Unit (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...registerSupply('additionalCosts', {
                    min: { value: 0, message: 'Additional costs must be non-negative' },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                  placeholder="0.00"
                />
                {supplyErrors.additionalCosts && (
                  <p className="mt-1 text-sm text-red-600">{supplyErrors.additionalCosts.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier (Optional)
                </label>
                <input
                  {...registerSupply('supplier')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  {...registerSupply('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                  placeholder="Enter any notes about this supply"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSupplyModalOpen(false);
                    clearSupplyErrors();
                    resetSupply();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#BE202E] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Add Supply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 font-sansation">
                Supply History - {selectedStock.name}
              </h3>
            </div>
            
            <div className="p-6">
              {selectedStock.supplyHistory && selectedStock.supplyHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Base Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedStock.supplyHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPeso(entry.baseCost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPeso(entry.totalCost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.supplier || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {entry.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No supply history available for this item.
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager; 