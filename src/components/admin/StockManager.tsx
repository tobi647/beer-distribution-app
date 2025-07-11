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
  generateId,
  downloadCSV,
  arrayToCSV,
  generateBatchId,
  calculateBatchComparison,
  formatBatchComparison
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
  // Enhanced batch tracking fields
  batchNumber?: string;
  deliveryDate?: string;
  origin?: string;
  shippingMethod?: string;
  reasonForCostChange?: string;
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

    const loadingToastId = showToast.loading('Adding supply batch...');
    
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

      // Calculate batch comparison if there's previous supply history
      let comparisonToPrevious;
      if (selectedStock.supplyHistory.length > 0) {
        const lastSupply = selectedStock.supplyHistory[0];
        comparisonToPrevious = calculateBatchComparison(
          baseCost, shippingCost, additionalCosts,
          lastSupply.baseCost, lastSupply.shippingCost, lastSupply.additionalCosts
        );
      }

      const batchId = generateBatchId();
      const currentDate = new Date();
      
      const supplyEntry: SupplyEntry = {
        id: generateId(),
        date: currentDate.toISOString(),
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
        // Enhanced batch tracking
        batchId,
        batchNumber: data.batchNumber || `${selectedStock.name.substring(0, 3).toUpperCase()}-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedStock.supplyHistory.length + 1).padStart(3, '0')}`,
        deliveryDate: data.deliveryDate,
        origin: data.origin,
        shippingMethod: data.shippingMethod,
        reasonForCostChange: data.reasonForCostChange,
        comparisonToPrevious
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

      showToast.update(loadingToastId, `Successfully added batch ${supplyEntry.batchNumber} (${quantity} units)`, 'success');
      setIsAddSupplyModalOpen(false);
      clearSupplyErrors();
      resetSupply();
    } catch (error) {
      console.error('Error adding supply:', error);
      showToast.update(loadingToastId, 'Failed to add supply batch', 'error');
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

  const handleExportSupplyHistory = (stock: Required<BeerStock>) => {
    if (!stock.supplyHistory || stock.supplyHistory.length === 0) {
      showToast.warning('No supply history data to export');
      return;
    }

    try {
      // Prepare CSV data
      const headers = [
        'Date',
        'Time',
        'Batch ID',
        'Batch Number',
        'Quantity',
        'Base Cost (₱)',
        'Shipping Cost (₱)',
        'Additional Costs (₱)',
        'Total Cost per Unit (₱)',
        'Total Investment (₱)',
        'Supplier',
        'Origin',
        'Shipping Method',
        'Delivery Date',
        'Notes',
        'Reason for Cost Change',
        'Cost vs Previous Batch',
        'Profit Margin (%)',
        'Price Change (₱)',
        'Avg Cost Change (₱)'
      ];

      const csvData = stock.supplyHistory.map(entry => [
        new Date(entry.date).toLocaleDateString(),
        new Date(entry.date).toLocaleTimeString(),
        entry.batchId,
        entry.batchNumber || '',
        entry.quantity,
        entry.baseCost.toFixed(2),
        entry.shippingCost.toFixed(2),
        entry.additionalCosts.toFixed(2),
        entry.totalCost.toFixed(2),
        (entry.quantity * entry.totalCost).toFixed(2),
        entry.supplier || '',
        entry.origin || '',
        entry.shippingMethod || '',
        entry.deliveryDate || '',
        entry.notes || '',
        entry.reasonForCostChange || '',
        entry.comparisonToPrevious ? formatBatchComparison(entry.comparisonToPrevious) : 'N/A (First batch)',
        entry.profitMargin.toFixed(1),
        entry.priceChange.toFixed(2),
        entry.averageCostChange.toFixed(2)
      ]);

      // Create comprehensive CSV content with summary info
      const summaryData = [
        [`Supply History Report - ${stock.name}`],
        [`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`],
        [`Product: ${stock.name} (${stock.type})`],
        [`Current Stock: ${stock.quantity} units`],
        [`Current Selling Price: ${formatPeso(stock.sellingPrice)}`],
        [`Total Supply Records: ${stock.supplyHistory.length}`],
        [`Total Units Added: ${stock.supplyHistory.reduce((sum, entry) => sum + entry.quantity, 0)}`],
        [`Total Investment: ${formatPeso(stock.supplyHistory.reduce((sum, entry) => sum + (entry.quantity * entry.totalCost), 0))}`],
        [`Average Cost per Unit: ${formatPeso(stock.supplyHistory.reduce((sum, entry) => sum + entry.totalCost, 0) / stock.supplyHistory.length)}`],
        [''], // Empty row
        headers,
        ...csvData
      ];

      const csvContent = arrayToCSV(summaryData);
      const filename = `supply-history-${stock.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCSV(csvContent, filename);
      showToast.success(`Supply history exported successfully`);
    } catch (error) {
      console.error('Error exporting supply history:', error);
      showToast.error('Failed to export supply history. Please try again.');
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

      {/* Enhanced Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#BE202E] to-[#9A1B24]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white font-sansation">
                  {isEditing ? `Edit Stock: ${selectedStock?.name}` : 'Add New Stock'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Basic Information */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Product Details
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Beer Name *
                        </label>
                        <input
                          {...register('name', { 
                            required: 'Beer name is required',
                            minLength: { value: 2, message: 'Name must be at least 2 characters' },
                            maxLength: { value: 50, message: 'Name must not exceed 50 characters' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="Enter beer name"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type *
                        </label>
                        <select
                          {...register('type', { required: 'Type is required' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                        >
                          <option value="">Select type</option>
                          <option value="Lager">Lager</option>
                          <option value="IPA">IPA (India Pale Ale)</option>
                          <option value="Ale">Ale</option>
                          <option value="Stout">Stout</option>
                          <option value="Wheat">Wheat Beer</option>
                          <option value="Pilsner">Pilsner</option>
                          <option value="Porter">Porter</option>
                          <option value="Sour">Sour Beer</option>
                        </select>
                        {errors.type && (
                          <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Supplier *
                        </label>
                        <input
                          {...register('supplier', { 
                            required: 'Supplier is required',
                            minLength: { value: 2, message: 'Supplier name must be at least 2 characters' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="Enter supplier name"
                          list="suppliers"
                        />
                        <datalist id="suppliers">
                          <option value="Premium Breweries Ltd" />
                          <option value="Craft Beer Co." />
                          <option value="Seasonal Brews Inc" />
                          <option value="Local Brewery" />
                          <option value="International Imports" />
                        </datalist>
                        {errors.supplier && (
                          <p className="mt-1 text-sm text-red-600">{errors.supplier.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inventory Management */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd"/>
                      </svg>
                      Inventory
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Quantity *
                        </label>
                        <input
                          type="number"
                          {...register('quantity', {
                            required: 'Quantity is required',
                            min: { value: 0, message: 'Quantity must be non-negative' },
                            max: { value: 10000, message: 'Quantity seems too high' }
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
                          Minimum Stock Alert *
                        </label>
                        <input
                          type="number"
                          {...register('minimumStock', {
                            required: 'Minimum stock is required',
                            min: { value: 0, message: 'Minimum stock must be non-negative' },
                            max: { value: safeNumber(formValues.quantity), message: 'Cannot exceed current quantity' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="0"
                        />
                        {errors.minimumStock && (
                          <p className="mt-1 text-sm text-red-600">{errors.minimumStock.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Alert when stock falls below this level
                        </p>
                      </div>

                      {/* Stock Status Indicator */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Stock Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            safeNumber(formValues.quantity) === 0 
                              ? 'bg-red-100 text-red-800' 
                              : safeNumber(formValues.quantity) <= safeNumber(formValues.minimumStock)
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {safeNumber(formValues.quantity) === 0 
                              ? 'Out of Stock' 
                              : safeNumber(formValues.quantity) <= safeNumber(formValues.minimumStock)
                              ? 'Low Stock'
                              : 'In Stock'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Column - Cost Structure */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                      </svg>
                      Cost Breakdown
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base Cost per Unit (₱) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('baseCost', {
                            required: 'Base cost is required',
                            min: { value: 0.01, message: 'Base cost must be greater than 0' },
                            max: { value: 1000, message: 'Base cost seems too high' }
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
                          Shipping Cost per Unit (₱)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('shippingCost', {
                            min: { value: 0, message: 'Shipping cost must be non-negative' },
                            max: { value: 100, message: 'Shipping cost seems too high' }
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
                          Additional Costs per Unit (₱)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('additionalCosts', {
                            min: { value: 0, message: 'Additional costs must be non-negative' },
                            max: { value: 100, message: 'Additional costs seem too high' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="0.00"
                        />
                        {errors.additionalCosts && (
                          <p className="mt-1 text-sm text-red-600">{errors.additionalCosts.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Includes handling, taxes, customs, etc.
                        </p>
                      </div>

                      {/* Cost Breakdown Summary */}
                      <div className="bg-white rounded-md p-3 border border-yellow-200">
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span>Base Cost:</span>
                            <span>{formatPeso(safeNumber(formValues.baseCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping:</span>
                            <span>{formatPeso(safeNumber(formValues.shippingCost))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Additional:</span>
                            <span>{formatPeso(safeNumber(formValues.additionalCosts))}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-yellow-200 pt-1">
                            <span>Total Cost:</span>
                            <span className="text-yellow-800">{formatPeso(totalCost)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Pricing & Profitability */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      Pricing Strategy
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Markup Strategy *
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            {...register('markup', {
                              required: 'Markup is required',
                              min: { value: 0, message: 'Markup must be non-negative' },
                              max: { 
                                value: formValues.isMarkupPercentage ? 500 : totalCost * 5, 
                                message: formValues.isMarkupPercentage 
                                  ? 'Markup percentage seems too high' 
                                  : 'Markup amount seems too high' 
                              }
                            })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                            placeholder="0.00"
                          />
                          <label className="flex items-center bg-gray-100 px-3 rounded-md">
                            <input
                              type="checkbox"
                              {...register('isMarkupPercentage')}
                              className="mr-2"
                            />
                            <span className="text-sm font-medium">%</span>
                          </label>
                        </div>
                        {errors.markup && (
                          <p className="mt-1 text-sm text-red-600">{errors.markup.message}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          <div className="grid grid-cols-2 gap-2">
                            <div>Typical ranges:</div>
                            <div></div>
                            <div>• Budget beers: 20-30%</div>
                            <div>• Premium beers: 40-60%</div>
                            <div>• Craft/Import: 50-80%</div>
                            <div>• Limited edition: 80%+</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Selling Price (₱) *
                          </label>
                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              {...register('isPriceLocked')}
                              className="mr-2"
                            />
                            <span className="font-medium">Lock Price</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          {...register('sellingPrice', {
                            required: 'Selling price is required',
                            min: { value: 0.01, message: 'Selling price must be greater than 0' },
                            validate: (value) => {
                              const price = safeNumber(value);
                              if (price <= totalCost) {
                                return 'Selling price should be higher than total cost for profit';
                              }
                              return true;
                            }
                          })}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent ${
                            !formValues.isPriceLocked ? 'bg-gray-100' : ''
                          }`}
                          placeholder="0.00"
                          readOnly={!formValues.isPriceLocked}
                        />
                        {errors.sellingPrice && (
                          <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>
                        )}
                        {formValues.isPriceLocked && (
                          <p className="mt-1 text-xs text-amber-600 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Price locked - automatic calculation disabled
                          </p>
                        )}
                      </div>

                      {/* Profitability Analysis */}
                      <div className="bg-white rounded-md p-3 border border-purple-200">
                        <h5 className="text-sm font-semibold text-purple-800 mb-2">Profitability Analysis</h5>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span>Cost per Unit:</span>
                            <span>{formatPeso(totalCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Selling Price:</span>
                            <span>{formatPeso(calculatedSellingPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Profit per Unit:</span>
                            <span className={calculatedSellingPrice > totalCost ? 'text-green-600' : 'text-red-600'}>
                              {formatPeso(Math.max(0, calculatedSellingPrice - totalCost))}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-purple-200 pt-1">
                            <span>Profit Margin:</span>
                            <span className={calculateProfitMargin(calculatedSellingPrice, totalCost) > 0 ? 'text-green-600' : 'text-red-600'}>
                              {calculateProfitMargin(calculatedSellingPrice, totalCost).toFixed(1)}%
                            </span>
                          </div>
                          {safeNumber(formValues.quantity) > 0 && (
                            <div className="flex justify-between text-purple-700 border-t border-purple-200 pt-1">
                              <span>Total Inventory Value:</span>
                              <span>{formatPeso(calculatedSellingPrice * safeNumber(formValues.quantity))}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pricing Calculation Formula */}
                      {!formValues.isPriceLocked && (
                        <div className="bg-white rounded-md p-3 border border-purple-200">
                          <h5 className="text-sm font-semibold text-purple-800 mb-2">Calculation</h5>
                          <div className="text-xs text-gray-600">
                            {formValues.isMarkupPercentage 
                              ? `${formatPeso(totalCost)} × (1 + ${Number(formValues.markup) || 0}%) = ${formatPeso(calculatedSellingPrice)}`
                              : `${formatPeso(totalCost)} + ${formatPeso(Number(formValues.markup) || 0)} = ${formatPeso(calculatedSellingPrice)}`
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Messages */}
              {(calculatedSellingPrice <= totalCost || calculateProfitMargin(calculatedSellingPrice, totalCost) < 10) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Pricing Warning</h3>
                      <div className="mt-2 text-sm text-red-700">
                        {calculatedSellingPrice <= totalCost && (
                          <p>• Current pricing results in a loss. Consider increasing markup.</p>
                        )}
                        {calculateProfitMargin(calculatedSellingPrice, totalCost) < 10 && calculatedSellingPrice > totalCost && (
                          <p>• Low profit margin ({calculateProfitMargin(calculatedSellingPrice, totalCost).toFixed(1)}%). Consider increasing markup for better profitability.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  * Required fields
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#BE202E] text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium shadow-md"
                  >
                    {isEditing ? 'Update Stock' : 'Add Stock'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Add Supply Modal */}
      {isAddSupplyModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#BE202E] to-[#9A1B24]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white font-sansation">
                  Add Supply: {selectedStock.name}
                </h3>
                <button
                  onClick={() => {
                    setIsAddSupplyModalOpen(false);
                    clearSupplyErrors();
                    resetSupply();
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitSupply(handleAddSupplySubmit)} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Supply Details */}
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd"/>
                      </svg>
                      Supply Information
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity to Add *
                        </label>
                        <input
                          type="number"
                          {...registerSupply('quantity', {
                            required: 'Quantity is required',
                            min: { value: 1, message: 'Quantity must be at least 1' },
                            max: { value: 10000, message: 'Quantity seems too high' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="Enter quantity"
                        />
                        {supplyErrors.quantity && (
                          <p className="mt-1 text-sm text-red-600">{supplyErrors.quantity.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Current stock: {selectedStock.quantity} units
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Supplier
                        </label>
                        <input
                          {...registerSupply('supplier')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="Enter supplier name"
                          list="supply-suppliers"
                          defaultValue="Bauhinia Brewery"
                        />
                        <datalist id="supply-suppliers">
                          <option value="Bauhinia Brewery" />
                          <option value="Premium Breweries Ltd" />
                          <option value="Craft Beer Co." />
                          <option value="Seasonal Brews Inc" />
                          <option value="Local Brewery" />
                          <option value="International Imports" />
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          {...registerSupply('notes')}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="Enter any notes about this supply delivery"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Column - Batch Tracking */}
                <div className="space-y-6">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Batch Tracking
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Batch Number
                        </label>
                        <input
                          {...registerSupply('batchNumber')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="Auto-generated if empty"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Leave empty for auto-generation
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Origin/Source
                        </label>
                        <input
                          {...registerSupply('origin')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="e.g., Bauhinia Brewery"
                          list="origins"
                          defaultValue="Bauhinia Brewery"
                        />
                        <datalist id="origins">
                          <option value="Bauhinia Brewery" />
                          <option value="Munich, Germany" />
                          <option value="Portland, Oregon, USA" />
                          <option value="Dublin, Ireland" />
                          <option value="Prague, Czech Republic" />
                          <option value="Pilsen, Czech Republic" />
                          <option value="Brussels, Belgium" />
                          <option value="Manila, Philippines" />
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Shipping Method
                        </label>
                        <select
                          {...registerSupply('shippingMethod')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                        >
                          <option value="">Select shipping method</option>
                          <option value="Sea Freight">Sea Freight</option>
                          <option value="Sea Freight + Refrigerated Truck">Sea Freight + Refrigerated Truck</option>
                          <option value="Air Freight">Air Freight</option>
                          <option value="Air Freight Express">Air Freight Express</option>
                          <option value="Ground Transport">Ground Transport</option>
                          <option value="Local Delivery">Local Delivery</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Date
                        </label>
                        <input
                          type="date"
                          {...registerSupply('deliveryDate')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason for Cost Change
                        </label>
                        <textarea
                          {...registerSupply('reasonForCostChange')}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="e.g., Fuel prices increased, Premium ingredients, Urgent delivery required"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Explain cost differences from previous batches
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Cost Analysis */}
                <div className="space-y-6">
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                      </svg>
                      Cost Analysis
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base Cost per Unit (₱) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...registerSupply('baseCost', {
                            required: 'Base cost is required',
                            min: { value: 0.01, message: 'Base cost must be greater than 0' },
                            max: { value: 1000, message: 'Base cost seems too high' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="0.00"
                          defaultValue={selectedStock.baseCost}
                        />
                        {supplyErrors.baseCost && (
                          <p className="mt-1 text-sm text-red-600">{supplyErrors.baseCost.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Current average: {formatPeso(selectedStock.baseCost)}
                        </p>
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
                            max: { value: 100, message: 'Shipping cost seems too high' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="0.00"
                          defaultValue={selectedStock.shippingCost}
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
                            max: { value: 100, message: 'Additional costs seem too high' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#BE202E] focus:border-transparent"
                          placeholder="0.00"
                          defaultValue={selectedStock.additionalCosts}
                        />
                        {supplyErrors.additionalCosts && (
                          <p className="mt-1 text-sm text-red-600">{supplyErrors.additionalCosts.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Handling, taxes, customs, etc.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cost Impact Analysis */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                      Impact Analysis
                    </h4>

                    <div className="bg-white rounded-md p-3 border border-green-200">
                      <div className="text-xs space-y-2">
                        <div className="flex justify-between">
                          <span>Current Stock:</span>
                          <span>{selectedStock.quantity} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span>New Supply:</span>
                          <span>+0 units</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-green-200 pt-2">
                          <span>Total After Supply:</span>
                          <span className="text-green-600">{selectedStock.quantity} units</span>
                        </div>
                        
                        <div className="border-t border-green-200 pt-2">
                          <div className="flex justify-between">
                            <span>Current Avg Cost:</span>
                            <span>{formatPeso(selectedStock.totalCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>New Supply Cost:</span>
                            <span>{formatPeso(0)}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>New Avg Cost:</span>
                            <span className="text-green-600">{formatPeso(selectedStock.totalCost)}</span>
                          </div>
                        </div>

                        <div className="border-t border-green-200 pt-2">
                          <div className="flex justify-between font-semibold">
                            <span>Total Investment:</span>
                            <span className="text-green-600">{formatPeso(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      <p>• New weighted average cost will be calculated automatically</p>
                      <p>• Selling price will be updated based on current markup settings</p>
                      <p>• Supply history will be recorded for tracking</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  * Required fields
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddSupplyModalOpen(false);
                      clearSupplyErrors();
                      resetSupply();
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#BE202E] text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium shadow-md"
                  >
                    Add Supply
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced History Modal */}
      {isHistoryModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#BE202E] to-[#9A1B24]">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white font-sansation">
                  Supply History: {selectedStock.name}
                </h3>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedStock.supplyHistory && selectedStock.supplyHistory.length > 0 ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd"/>
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-blue-600">Total Supplies</div>
                          <div className="text-2xl font-bold text-blue-900">{selectedStock.supplyHistory.length}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-green-600">Units Added</div>
                          <div className="text-2xl font-bold text-green-900">
                            {selectedStock.supplyHistory.reduce((sum, entry) => sum + entry.quantity, 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-yellow-600">Total Investment</div>
                          <div className="text-2xl font-bold text-yellow-900">
                            {formatPeso(selectedStock.supplyHistory.reduce((sum, entry) => sum + (entry.quantity * entry.totalCost), 0))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-purple-600">Avg Cost/Unit</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {formatPeso(selectedStock.supplyHistory.reduce((sum, entry) => sum + entry.totalCost, 0) / selectedStock.supplyHistory.length)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Table */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-gray-900">Supply Records</h4>
                        <button
                          onClick={() => handleExportSupplyHistory(selectedStock)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date & Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Batch Info
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Costs
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost vs Previous
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Investment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Origin & Shipping
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Supplier & Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedStock.supplyHistory.map((entry, index) => (
                            <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                                  <div className="text-xs text-gray-500">{new Date(entry.date).toLocaleTimeString()}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="space-y-1">
                                  <div className="font-medium text-purple-600">{entry.batchNumber || entry.batchId}</div>
                                  {entry.deliveryDate && (
                                    <div className="text-xs text-gray-500">
                                      Delivered: {new Date(entry.deliveryDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  +{entry.quantity} units
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="space-y-1">
                                  <div className="font-medium">{formatPeso(entry.totalCost)}</div>
                                  <div className="text-xs text-gray-500">
                                    Base: {formatPeso(entry.baseCost)} | Ship: {formatPeso(entry.shippingCost)} | Add: {formatPeso(entry.additionalCosts)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {entry.comparisonToPrevious ? (
                                  <div className="space-y-1">
                                    <div className={`font-medium ${entry.comparisonToPrevious.totalCostDiff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatBatchComparison(entry.comparisonToPrevious)}
                                    </div>
                                    {entry.reasonForCostChange && (
                                      <div className="text-xs text-gray-500 max-w-xs truncate" title={entry.reasonForCostChange}>
                                        {entry.reasonForCostChange}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">First batch</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {formatPeso(entry.quantity * entry.totalCost)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="space-y-1">
                                  {entry.origin && (
                                    <div className="text-xs font-medium">{entry.origin}</div>
                                  )}
                                  {entry.shippingMethod && (
                                    <div className="text-xs text-gray-500">{entry.shippingMethod}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="space-y-1">
                                  <div className="font-medium">{entry.supplier || '-'}</div>
                                  {entry.notes && (
                                    <div className="text-xs text-gray-500 max-w-xs truncate" title={entry.notes}>
                                      {entry.notes}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No supply history</h3>
                  <p className="mt-1 text-sm text-gray-500">No supply records available for this item yet.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setIsHistoryModalOpen(false);
                        setIsAddSupplyModalOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#BE202E] hover:bg-opacity-90 transition-colors"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
                      </svg>
                      Add First Supply
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {selectedStock.supplyHistory && selectedStock.supplyHistory.length > 0 
                    ? `${selectedStock.supplyHistory.length} supply record${selectedStock.supplyHistory.length !== 1 ? 's' : ''} found`
                    : 'No records found'
                  }
                </div>
                <div className="flex space-x-3">
                  {selectedStock.supplyHistory && selectedStock.supplyHistory.length > 0 && (
                    <>
                      <button
                        onClick={() => handleExportSupplyHistory(selectedStock)}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                      </button>
                      <button
                        onClick={() => {
                          setIsHistoryModalOpen(false);
                          setIsAddSupplyModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#BE202E] text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
                      >
                        Add New Supply
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsHistoryModalOpen(false)}
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

export default StockManager; 