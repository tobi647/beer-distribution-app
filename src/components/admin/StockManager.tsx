import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { showToast } from '../../utils/toast';
import DataTable from '../DataTable';

interface SupplyEntry {
  id: string;
  date: string;
  quantity: number;
  baseCost: number;
  shippingCost: number;
  additionalCosts: number;
  totalCost: number;
  notes?: string;
  supplier?: string;
  profitMargin: number;
  priceChange: number;
  averageCostChange: number;
  priceBeforeLock?: number;
  wasAutoCalculated: boolean;
  priceLockChanged?: boolean;
}

interface HistoryFilters {
  dateFrom: string;
  dateTo: string;
  supplier: string;
  minQuantity: number;
  maxQuantity: number;
}

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
  isPriceLocked: boolean;
  available: boolean;
  minimumStock: number;
  supplier: string;
  supplyHistory: SupplyEntry[];
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

const calculateTotalCost = (baseCost: number, shippingCost: number, additionalCosts: number): number => {
  return baseCost + shippingCost + additionalCosts;
};

const calculateSellingPrice = (totalCost: number, markup: number, isMarkupPercentage: boolean): number => {
  return isMarkupPercentage ? totalCost * (1 + markup / 100) : totalCost + markup;
};

// Helper functions
const calculateSuggestedPrice = (stock: BeerStock): number => {
  return stock.isMarkupPercentage
    ? stock.totalCost * (1 + stock.markup / 100)
    : stock.totalCost + stock.markup;
};

const shouldWarnPriceDifference = (currentPrice: number, suggestedPrice: number): boolean => {
  const priceDiffPercentage = Math.abs((currentPrice - suggestedPrice) / suggestedPrice * 100);
  return priceDiffPercentage > 15; // Warn if difference is more than 15%
};

interface Column {
  header: string;
  accessor: ((stock: BeerStock) => React.ReactNode) | keyof BeerStock;
  className?: string;
  sortable?: boolean;
  sortField?: SortField;
}

// Helper function for currency formatting
const formatPeso = (amount: number): string => {
  return `₱${amount.toFixed(2)}`;
};

const StockManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stocks, setStocks] = useState<BeerStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<BeerStock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddSupplyModalOpen, setIsAddSupplyModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'name',
    order: 'asc',
  });
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({
    dateFrom: '',
    dateTo: '',
    supplier: '',
    minQuantity: 0,
    maxQuantity: Infinity,
  });
  const [historySortField, setHistorySortField] = useState<'date' | 'quantity' | 'totalCost'>('date');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
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
  });

  const {
    register: registerSupply,
    handleSubmit: handleSubmitSupply,
    reset: resetSupply,
    formState: { errors: supplyErrors },
  } = useForm<AddSupplyFormData>({
    defaultValues: {
      quantity: 0,
      baseCost: 0,
      shippingCost: 0,
      additionalCosts: 0,
    },
  });

  // Mock data
  const mockStocks: BeerStock[] = [
    {
      id: 'beer1',
      name: 'Premium Lager',
      type: 'Lager',
      quantity: 150,
      baseCost: 2.50,
      shippingCost: 0.50,
      additionalCosts: 0.20,
      markup: 40,
      isMarkupPercentage: true,
      totalCost: 3.20,
      sellingPrice: 4.48,
      isPriceLocked: false,
      available: true,
      minimumStock: 50,
      supplier: 'Premium Breweries Ltd',
      supplyHistory: [
        {
          id: 'supply1',
          date: '2023-10-20T10:00:00Z',
          quantity: 50,
          baseCost: 2.60,
          shippingCost: 0.60,
          additionalCosts: 0.25,
          totalCost: 3.45,
          notes: 'Good quality',
          supplier: 'Craft Beer Co.',
          profitMargin: 28.5,
          priceChange: 0.15,
          averageCostChange: 0.25,
          wasAutoCalculated: true,
          priceLockChanged: false,
        },
      ],
    },
    {
      id: 'beer2',
      name: 'Craft IPA',
      type: 'IPA',
      quantity: 80,
      baseCost: 3.00,
      shippingCost: 0.70,
      additionalCosts: 0.30,
      markup: 45,
      isMarkupPercentage: true,
      totalCost: 4.00,
      sellingPrice: 5.80,
      isPriceLocked: false,
      available: true,
      minimumStock: 30,
      supplier: 'Craft Beer Co.',
      supplyHistory: [
        {
          id: 'supply2',
          date: '2023-10-19T14:30:00Z',
          quantity: 30,
          baseCost: 3.10,
          shippingCost: 0.80,
          additionalCosts: 0.35,
          totalCost: 4.25,
          notes: 'Quick delivery',
          supplier: 'Premium Breweries Ltd',
          profitMargin: 31.2,
          priceChange: 0.20,
          averageCostChange: 0.25,
          wasAutoCalculated: true,
          priceLockChanged: false,
        },
      ],
    },
    {
      id: 'beer3',
      name: 'Seasonal Ale',
      type: 'Ale',
      quantity: 100,
      baseCost: 2.80,
      shippingCost: 0.55,
      additionalCosts: 0.25,
      markup: 35,
      isMarkupPercentage: true,
      totalCost: 3.60,
      sellingPrice: 4.86,
      isPriceLocked: false,
      available: true,
      minimumStock: 40,
      supplier: 'Seasonal Brews Inc',
      supplyHistory: [],
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
        // Update the stock with new values
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
        
        // If price or lock status changed, update price history
        if (selectedStock.sellingPrice !== sellingPrice || selectedStock.isPriceLocked !== data.isPriceLocked) {
          handlePriceUpdate(selectedStock.id, sellingPrice, data.isPriceLocked);
        }

        showToast.update(loadingToastId, 'Stock updated successfully!', 'success');
      } else {
        // TODO: Implement create API call
        const newStock: BeerStock = {
          id: Date.now().toString(), // Temporary ID generation
          ...data,
          totalCost,
          sellingPrice,
          available: data.quantity > 0,
          supplyHistory: [], // New stocks have no history
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

  const handleAddSupply = (stock: BeerStock) => {
    setSelectedStock(stock);
    setIsAddSupplyModalOpen(true);
  };

  const handleAddSupplySubmit = async (data: AddSupplyFormData) => {
    if (!selectedStock) return;

    const loadingToastId = showToast.loading('Adding supply...');
    
    try {
      const newSupplyTotalCost = calculateTotalCost(
        data.baseCost,
        data.shippingCost,
        data.additionalCosts
      );

      // Calculate changes and margins
      const oldTotalValue = selectedStock.totalCost * selectedStock.quantity;
      const newSupplyTotalValue = newSupplyTotalCost * data.quantity;
      const combinedQuantity = selectedStock.quantity + data.quantity;
      const newAverageCost = (oldTotalValue + newSupplyTotalValue) / combinedQuantity;
      const averageCostChange = newAverageCost - selectedStock.totalCost;
      
      const oldSellingPrice = selectedStock.sellingPrice;
      // Only calculate new selling price if price is not locked
      const newSellingPrice = selectedStock.isPriceLocked
        ? oldSellingPrice
        : selectedStock.isMarkupPercentage
          ? newAverageCost * (1 + selectedStock.markup / 100)
          : newAverageCost + selectedStock.markup;
      const priceChange = newSellingPrice - oldSellingPrice;
      
      const profitMargin = ((newSellingPrice - newAverageCost) / newAverageCost) * 100;

      const supplyEntry: SupplyEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        quantity: data.quantity,
        baseCost: data.baseCost,
        shippingCost: data.shippingCost,
        additionalCosts: data.additionalCosts,
        totalCost: newSupplyTotalCost,
        notes: data.notes,
        supplier: data.supplier,
        profitMargin,
        priceChange,
        averageCostChange,
        wasAutoCalculated: !selectedStock.isPriceLocked,
        priceLockChanged: false,
      };

      // Update the stock with new values and add to history
      setStocks((prev) =>
        prev.map((stock) =>
          stock.id === selectedStock.id
            ? {
                ...stock,
                quantity: combinedQuantity,
                baseCost: newAverageCost,
                totalCost: newAverageCost,
                sellingPrice: newSellingPrice,
                available: true,
                supplyHistory: [supplyEntry, ...(stock.supplyHistory || [])],
              }
            : stock
        )
      );

      showToast.update(
        loadingToastId,
        `Successfully added ${data.quantity} units. New average cost: ₱${newAverageCost.toFixed(2)}`,
        'success'
      );
      setIsAddSupplyModalOpen(false);
    } catch (error) {
      console.error('Error adding supply:', error);
      showToast.update(loadingToastId, 'Failed to add supply. Please try again.', 'error');
    }
  };

  // Add a preview calculation function
  const calculatePreview = (data: AddSupplyFormData) => {
    if (!selectedStock || !data.quantity || !data.baseCost) return null;

    const newSupplyTotalCost = calculateTotalCost(
      data.baseCost,
      data.shippingCost || 0,
      data.additionalCosts || 0
    );

    const existingTotalValue = selectedStock.totalCost * selectedStock.quantity;
    const newSupplyTotalValue = newSupplyTotalCost * data.quantity;
    const combinedQuantity = selectedStock.quantity + data.quantity;
    const newAverageCostPerUnit = (existingTotalValue + newSupplyTotalValue) / combinedQuantity;
    const roundedAverageCost = Math.round(newAverageCostPerUnit * 100) / 100;

    const newSellingPrice = selectedStock.isMarkupPercentage
      ? roundedAverageCost * (1 + selectedStock.markup / 100)
      : roundedAverageCost + selectedStock.markup;

    return {
      newQuantity: combinedQuantity,
      newAverageCost: roundedAverageCost,
      newSellingPrice: Math.round(newSellingPrice * 100) / 100,
    };
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

  const handleViewHistory = (stock: BeerStock) => {
    setSelectedStock(stock);
    setIsHistoryModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStock(null);
    setIsEditing(false);
    reset();
  };

  const handlePriceUpdate = (stockId: string, newPrice: number, isPriceLocked: boolean) => {
    setStocks((prev) =>
      prev.map((stock) => {
        if (stock.id !== stockId) return stock;

        const suggestedPrice = calculateSuggestedPrice(stock);
        const showWarning = isPriceLocked && shouldWarnPriceDifference(newPrice, suggestedPrice);

        if (showWarning) {
          setShowPriceWarning(true);
          setSuggestedPrice(suggestedPrice);
        }

        // Create a price change history entry
        const priceHistoryEntry: SupplyEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          quantity: 0, // No quantity change for price updates
          baseCost: stock.baseCost,
          shippingCost: stock.shippingCost,
          additionalCosts: stock.additionalCosts,
          totalCost: stock.totalCost,
          profitMargin: ((newPrice - stock.totalCost) / stock.totalCost) * 100,
          priceChange: newPrice - stock.sellingPrice,
          averageCostChange: 0,
          priceBeforeLock: stock.sellingPrice,
          wasAutoCalculated: false,
          priceLockChanged: stock.isPriceLocked !== isPriceLocked,
          notes: `Price ${isPriceLocked ? 'locked' : 'unlocked'} manually`,
        };

        return {
          ...stock,
          sellingPrice: newPrice,
          isPriceLocked,
          supplyHistory: [priceHistoryEntry, ...stock.supplyHistory],
          // If price is locked, calculate implied markup
          ...(isPriceLocked && {
            markup: stock.isMarkupPercentage
              ? ((newPrice / stock.totalCost - 1) * 100)
              : (newPrice - stock.totalCost),
          }),
        };
      })
    );
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
        <span className="font-medium">{formatPeso(stock.baseCost)}</span>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'baseCost' as const,
    },
    {
      header: 'Total Cost',
      accessor: (stock: BeerStock) => (
        <span className="font-medium">{formatPeso(stock.totalCost)}</span>
      ),
      className: 'text-right',
      sortable: true,
      sortField: 'totalCost' as const,
    },
    {
      header: 'Selling Price',
      accessor: (stock: BeerStock) => (
        <div className="flex items-center space-x-2">
          <span className="font-medium">₱{stock.sellingPrice.toFixed(2)}</span>
          {stock.isPriceLocked && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          )}
        </div>
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
        <div className="flex justify-end space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddSupply(stock);
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
              handleEdit(stock);
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
              handleDelete(stock);
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewHistory(stock);
            }}
            className="p-1.5 text-gray-600 hover:text-[#BE202E] hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="View supply history"
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
              // TODO: Implement view details functionality
              showToast.info('View details coming soon!');
            }}
            className="p-1.5 text-gray-600 hover:text-[#BE202E] hover:bg-red-50 rounded-lg transition-colors duration-200"
            title="View details"
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
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  // Function to filter and sort history entries
  const filteredAndSortedHistory = useMemo(() => {
    if (!selectedStock?.supplyHistory) return [];

    return selectedStock.supplyHistory
      .filter((entry) => {
        const entryDate = new Date(entry.date);
        const fromDate = historyFilters.dateFrom ? new Date(historyFilters.dateFrom) : new Date(0);
        const toDate = historyFilters.dateTo ? new Date(historyFilters.dateTo) : new Date();
        
        return (
          entryDate >= fromDate &&
          entryDate <= toDate &&
          (!historyFilters.supplier || entry.supplier?.toLowerCase().includes(historyFilters.supplier.toLowerCase())) &&
          entry.quantity >= historyFilters.minQuantity &&
          (historyFilters.maxQuantity === Infinity || entry.quantity <= historyFilters.maxQuantity)
        );
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (historySortField) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'quantity':
            comparison = a.quantity - b.quantity;
            break;
          case 'totalCost':
            comparison = a.totalCost - b.totalCost;
            break;
        }
        return historySortOrder === 'asc' ? comparison : -comparison;
      });
  }, [selectedStock, historyFilters, historySortField, historySortOrder]);

  const handleExportHistory = () => {
    if (!selectedStock?.supplyHistory?.length) {
      showToast.error('No history data to export');
      return;
    }

    const headers = [
      'Date',
      'Quantity',
      'Base Cost (₱)',
      'Shipping Cost (₱)',
      'Additional Costs (₱)',
      'Total Cost (₱)',
      'Profit Margin (%)',
      'Price Change (₱)',
      'Avg Cost Change (₱)',
      'Supplier',
      'Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredAndSortedHistory.map(entry => [
        new Date(entry.date).toLocaleString('en-PH'),
        entry.quantity,
        entry.baseCost.toFixed(2),
        entry.shippingCost.toFixed(2),
        entry.additionalCosts.toFixed(2),
        entry.totalCost.toFixed(2),
        entry.profitMargin.toFixed(2),
        entry.priceChange.toFixed(2),
        entry.averageCostChange.toFixed(2),
        `"${entry.supplier || ''}"`,
        `"${entry.notes?.replace(/"/g, '""') || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedStock.name}_supply_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 font-sansation">Stock Management</h2>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setIsEditing(false);
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
          {/* Search icon */}
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

      {/* Modal */}
      {(isModalOpen || isEditing) && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-900 font-sansation">
                  {isEditing ? 'Edit Stock' : 'Add New Stock'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      {...register('name', { required: 'Name is required' })}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                        errors.name
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#BE202E]'
                      } focus:ring-2 focus:border-transparent outline-none`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <input
                      type="text"
                      {...register('type', { required: 'Type is required' })}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                        errors.type
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#BE202E]'
                      } focus:ring-2 focus:border-transparent outline-none`}
                    />
                    {errors.type && (
                      <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                    )}
                  </div>
                </div>

                {/* Cost Section */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Cost Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="baseCost" className="block text-sm font-medium text-gray-700 mb-1">
                        Base Cost (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('baseCost', {
                          required: 'Base cost is required',
                          min: { value: 0, message: 'Base cost must be greater than 0' },
                          valueAsNumber: true,
                        })}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                          errors.baseCost
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#BE202E]'
                        } focus:ring-2 focus:border-transparent outline-none`}
                      />
                      {errors.baseCost && (
                        <p className="mt-1 text-sm text-red-600">{errors.baseCost.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="shippingCost" className="block text-sm font-medium text-gray-700 mb-1">
                        Shipping Cost (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('shippingCost', {
                          required: 'Shipping cost is required',
                          min: { value: 0, message: 'Shipping cost must be greater than 0' },
                          valueAsNumber: true,
                        })}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                          errors.shippingCost
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#BE202E]'
                        } focus:ring-2 focus:border-transparent outline-none`}
                      />
                      {errors.shippingCost && (
                        <p className="mt-1 text-sm text-red-600">{errors.shippingCost.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="additionalCosts" className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Costs (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('additionalCosts', {
                          required: 'Additional costs are required',
                          min: { value: 0, message: 'Additional costs must be greater than 0' },
                          valueAsNumber: true,
                        })}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                          errors.additionalCosts
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#BE202E]'
                        } focus:ring-2 focus:border-transparent outline-none`}
                      />
                      {errors.additionalCosts && (
                        <p className="mt-1 text-sm text-red-600">{errors.additionalCosts.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label htmlFor="markup" className="block text-sm font-medium text-gray-700 mb-1">
                        Markup {!watch('isMarkupPercentage') && '(₱)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('markup', {
                          required: 'Markup is required',
                          min: { value: 0, message: 'Markup must be greater than 0' },
                          valueAsNumber: true,
                        })}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                          errors.markup
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#BE202E]'
                        } focus:ring-2 focus:border-transparent outline-none`}
                      />
                      {errors.markup && (
                        <p className="mt-1 text-sm text-red-600">{errors.markup.message}</p>
                      )}
                    </div>

                    <div className="flex items-center">
                      <label className="inline-flex items-center mt-6">
                        <input
                          type="checkbox"
                          {...register('isMarkupPercentage')}
                          className="form-checkbox h-5 w-5 text-[#BE202E] rounded border-gray-300 focus:ring-[#BE202E]"
                        />
                        <span className="ml-2 text-sm text-gray-700">Markup is a percentage</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Add price control section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Price Control
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <input
                          type="checkbox"
                          {...register('isPriceLocked', {
                            onChange: (e) => {
                              if (selectedStock) {
                                const currentPrice = watch('sellingPrice') || selectedStock.sellingPrice;
                                handlePriceUpdate(selectedStock.id, currentPrice, e.target.checked);
                              }
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#BE202E]">
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          Lock Price
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      {...register('sellingPrice', {
                        valueAsNumber: true,
                        min: 0,
                        onChange: (e) => {
                          const newPrice = parseFloat(e.target.value);
                          if (!isNaN(newPrice) && selectedStock) {
                            if (watch('isPriceLocked')) {
                              const calculatedPrice = calculateSuggestedPrice(selectedStock);
                              if (shouldWarnPriceDifference(newPrice, calculatedPrice)) {
                                setSuggestedPrice(calculatedPrice);
                                setShowPriceWarning(true);
                              }
                            }
                            handlePriceUpdate(selectedStock.id, newPrice, watch('isPriceLocked'));
                          }
                        },
                      })}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:border-transparent outline-none pl-8 transition-colors duration-200 ${
                        watch('isPriceLocked')
                          ? 'border-[#BE202E] bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="Enter selling price"
                    />
                    <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  </div>

                  {watch('isPriceLocked') && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center space-x-2 text-[#BE202E]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="font-medium">Price is locked</span>
                      </div>
                      <p className="mt-1 text-gray-600">
                        This price will remain fixed and won't be recalculated when adding new supply
                      </p>
                    </div>
                  )}
                </div>

                {/* Stock Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      {...register('quantity', {
                        required: 'Quantity is required',
                        min: { value: 0, message: 'Quantity must be greater than 0' },
                        valueAsNumber: true,
                      })}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                        errors.quantity
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#BE202E]'
                      } focus:ring-2 focus:border-transparent outline-none`}
                    />
                    {errors.quantity && (
                      <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="minimumStock" className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      {...register('minimumStock', {
                        required: 'Minimum stock is required',
                        min: { value: 0, message: 'Minimum stock must be greater than 0' },
                        valueAsNumber: true,
                      })}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                        errors.minimumStock
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-[#BE202E]'
                      } focus:ring-2 focus:border-transparent outline-none`}
                    />
                    {errors.minimumStock && (
                      <p className="mt-1 text-sm text-red-600">{errors.minimumStock.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    {...register('supplier', { required: 'Supplier is required' })}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                      errors.supplier
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-[#BE202E]'
                    } focus:ring-2 focus:border-transparent outline-none`}
                  />
                  {errors.supplier && (
                    <p className="mt-1 text-sm text-red-600">{errors.supplier.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-gotham"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#BE202E] text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-gotham"
                  >
                    {isEditing ? 'Update Stock' : 'Add Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Supply Modal */}
      {isAddSupplyModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 font-sansation">
                    Add Supply
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedStock.name} ({selectedStock.type})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAddSupplyModalOpen(false);
                    resetSupply();
                    setSelectedStock(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitSupply(handleAddSupplySubmit)} className="space-y-6">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Add
                  </label>
                  <input
                    type="number"
                    {...registerSupply('quantity', {
                      required: 'Quantity is required',
                      min: { value: 1, message: 'Quantity must be at least 1' },
                      valueAsNumber: true,
                    })}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                      supplyErrors.quantity
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-[#BE202E]'
                    } focus:ring-2 focus:border-transparent outline-none`}
                  />
                  {supplyErrors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{supplyErrors.quantity.message}</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">Cost Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="baseCost" className="block text-sm font-medium text-gray-700 mb-1">
                        Base Cost (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...registerSupply('baseCost', {
                          required: 'Base cost is required',
                          min: { value: 0, message: 'Base cost must be greater than 0' },
                          valueAsNumber: true,
                        })}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                          supplyErrors.baseCost
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#BE202E]'
                        } focus:ring-2 focus:border-transparent outline-none`}
                      />
                      {supplyErrors.baseCost && (
                        <p className="mt-1 text-sm text-red-600">{supplyErrors.baseCost.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="shippingCost" className="block text-sm font-medium text-gray-700 mb-1">
                        Shipping Cost (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...registerSupply('shippingCost', {
                          required: 'Shipping cost is required',
                          min: { value: 0, message: 'Shipping cost must be greater than 0' },
                          valueAsNumber: true,
                        })}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                          supplyErrors.shippingCost
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#BE202E]'
                        } focus:ring-2 focus:border-transparent outline-none`}
                      />
                      {supplyErrors.shippingCost && (
                        <p className="mt-1 text-sm text-red-600">{supplyErrors.shippingCost.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="additionalCosts" className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Costs (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...registerSupply('additionalCosts', {
                          required: 'Additional costs are required',
                          min: { value: 0, message: 'Additional costs must be greater than 0' },
                          valueAsNumber: true,
                        })}
                        className={`w-full px-3 py-2 border rounded-lg shadow-sm ${
                          supplyErrors.additionalCosts
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#BE202E]'
                        } focus:ring-2 focus:border-transparent outline-none`}
                      />
                      {supplyErrors.additionalCosts && (
                        <p className="mt-1 text-sm text-red-600">{supplyErrors.additionalCosts.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier
                    </label>
                    <input
                      type="text"
                      {...registerSupply('supplier')}
                      className="w-full px-3 py-2 border rounded-lg shadow-sm border-gray-300 focus:ring-[#BE202E] focus:ring-2 focus:border-transparent outline-none"
                      placeholder="Enter supplier name"
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      {...registerSupply('notes')}
                      className="w-full px-3 py-2 border rounded-lg shadow-sm border-gray-300 focus:ring-[#BE202E] focus:ring-2 focus:border-transparent outline-none"
                      rows={3}
                      placeholder="Enter any additional notes or delivery reference"
                    />
                  </div>
                </div>

                {/* Add Preview Section */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">Current Values</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Current Quantity:</span>
                      <span className="ml-2 font-medium">{selectedStock.quantity} units</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Cost:</span>
                      <span className="ml-2 font-medium">₱{selectedStock.totalCost.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Price:</span>
                      <span className="ml-2 font-medium">₱{selectedStock.sellingPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Markup:</span>
                      <span className="ml-2 font-medium">
                        {selectedStock.isMarkupPercentage 
                          ? `${selectedStock.markup}%` 
                          : `₱${selectedStock.markup.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview Calculations */}
                {watch('quantity') > 0 && watch('baseCost') > 0 && (
                  <div className="bg-[#BE202E] bg-opacity-5 p-4 rounded-lg space-y-4">
                    <h4 className="text-lg font-medium text-[#BE202E]">Preview After Changes</h4>
                    {(() => {
                      const preview = calculatePreview({
                        quantity: watch('quantity'),
                        baseCost: watch('baseCost'),
                        shippingCost: watch('shippingCost'),
                        additionalCosts: watch('additionalCosts'),
                      });

                      return preview && (
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">New Total Quantity:</span>
                            <span className="font-medium">{preview.newQuantity} units</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">New Average Cost:</span>
                            <span className="font-medium">₱{preview.newAverageCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">New Selling Price:</span>
                            <span className="font-medium text-[#BE202E]">
                              ₱{preview.newSellingPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddSupplyModalOpen(false);
                      resetSupply();
                      setSelectedStock(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-gotham"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#BE202E] text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-gotham"
                  >
                    Add Supply
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Supply History Modal */}
      {isHistoryModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900 font-sansation">
                  Supply History
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStock.name} ({selectedStock.type})
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportHistory}
                  className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors duration-200 flex items-center space-x-1"
                  title="Export to CSV"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export</span>
                </button>
                <button
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setSelectedStock(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={historyFilters.dateFrom}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={historyFilters.dateTo}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={historyFilters.supplier}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Filter by supplier"
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={historyFilters.minQuantity || ''}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, minQuantity: Number(e.target.value) || 0 }))}
                      placeholder="Min"
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={historyFilters.maxQuantity === Infinity ? '' : historyFilters.maxQuantity}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, maxQuantity: Number(e.target.value) || Infinity }))}
                      placeholder="Max"
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 mt-4">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  value={historySortField}
                  onChange={(e) => setHistorySortField(e.target.value as typeof historySortField)}
                  className="px-3 py-1.5 border rounded-lg text-sm"
                >
                  <option value="date">Date</option>
                  <option value="quantity">Quantity</option>
                  <option value="totalCost">Total Cost</option>
                </select>
                <button
                  onClick={() => setHistorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 text-gray-600 hover:text-[#BE202E] rounded-lg transition-colors duration-200"
                >
                  {historySortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-400px)]">
              {filteredAndSortedHistory.length > 0 ? (
                <div className="space-y-4">
                  {filteredAndSortedHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#BE202E] transition-colors duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(entry.date).toLocaleDateString('en-PH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {entry.quantity} units
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Base Cost:</span>
                          <span className="ml-2 font-medium">₱{entry.baseCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Shipping Cost:</span>
                          <span className="ml-2 font-medium">₱{entry.shippingCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Additional Costs:</span>
                          <span className="ml-2 font-medium">₱{entry.additionalCosts.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Cost:</span>
                          <span className="ml-2 font-medium text-[#BE202E]">₱{entry.totalCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Profit Margin:</span>
                          <span className={`ml-2 font-medium ${entry.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.profitMargin.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Price Change:</span>
                          <span className={`ml-2 font-medium ${entry.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₱{entry.priceChange.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Cost Change:</span>
                          <span className={`ml-2 font-medium ${entry.averageCostChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₱{entry.averageCostChange.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {(entry.notes || entry.supplier) && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-sm">
                          {entry.supplier && (
                            <div className="text-gray-600">
                              Supplier: <span className="font-medium">{entry.supplier}</span>
                            </div>
                          )}
                          {entry.notes && (
                            <div className="text-gray-600 mt-1">
                              Notes: <span className="font-medium">{entry.notes}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {entry.priceLockChanged && (
                        <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>
                              Price was {entry.priceBeforeLock ? 'locked' : 'unlocked'} 
                              {entry.priceBeforeLock && ` (Previous: ₱${entry.priceBeforeLock.toFixed(2)})`}
                            </span>
                          </div>
                        </div>
                      )}

                      {!entry.wasAutoCalculated && (
                        <div className="col-span-2 text-gray-500 text-sm italic">
                          Price was manually set
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No matching supply history entries
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price Warning Modal */}
      {showPriceWarning && suggestedPrice !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">Unusual Price Detected</h3>
                <p className="mt-2 text-sm text-gray-500">
                  The price you're setting is significantly different from our suggested price:
                </p>
                <div className="mt-3 bg-yellow-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <p>Your price: <span className="font-medium">₱{watch('sellingPrice')?.toFixed(2)}</span></p>
                    <p>Suggested price: <span className="font-medium">₱{suggestedPrice.toFixed(2)}</span></p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Are you sure you want to proceed with this price?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPriceWarning(false);
                  setValue('isPriceLocked', false);
                  setValue('sellingPrice', suggestedPrice);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Use suggested price
              </button>
              <button
                type="button"
                onClick={() => setShowPriceWarning(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#BE202E] rounded-md hover:bg-[#A01B27]"
              >
                Keep my price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager; 