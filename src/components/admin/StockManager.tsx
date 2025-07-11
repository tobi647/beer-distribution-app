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

interface BulkSupplyEntry {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  baseCost: number;
  shippingCost: number;
  additionalCosts: number;
  supplier: string;
  notes?: string;
}

interface BulkBatchFormData {
  batchNumber?: string;
  deliveryDate?: string;
  origin?: string;
  shippingMethod?: string;
  generalNotes?: string;
  entries: BulkSupplyEntry[];
}

interface BatchHistoryRecord {
  id: string;
  batchNumber: string;
  deliveryDate: string;
  processedDate: string;
  origin?: string;
  shippingMethod?: string;
  generalNotes?: string;
  totalProducts: number;
  totalUnits: number;
  totalInvestment: number;
  products: Array<{
    productId: string;
    productName: string;
    productType: string;
    quantity: number;
    baseCost: number;
    shippingCost: number;
    additionalCosts: number;
    totalCost: number;
    supplier: string;
    notes?: string;
  }>;
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
  const [isBulkBatchModalOpen, setIsBulkBatchModalOpen] = useState(false);
  const [bulkBatchEntries, setBulkBatchEntries] = useState<BulkSupplyEntry[]>([]);
  const [batchHistory, setBatchHistory] = useState<BatchHistoryRecord[]>([]);
  const [isBatchHistoryModalOpen, setIsBatchHistoryModalOpen] = useState(false);
  const [dailyBatchCounters, setDailyBatchCounters] = useState<Record<string, number>>({});
  const [currentBatchNumber, setCurrentBatchNumber] = useState<string>('');
  
  // Batch History Filter and Sort States
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchSortField, setBatchSortField] = useState<'processedDate' | 'deliveryDate' | 'batchNumber' | 'totalInvestment' | 'totalProducts' | 'totalUnits'>('processedDate');
  const [batchSortDirection, setBatchSortDirection] = useState<'asc' | 'desc'>('desc');
  const [batchDateFilter, setBatchDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [batchDateFrom, setBatchDateFrom] = useState('');
  const [batchDateTo, setBatchDateTo] = useState('');
  const [batchCurrentPage, setBatchCurrentPage] = useState(1);
  const [batchItemsPerPage] = useState(10);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

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

  const {
    register: registerBulkBatch,
    handleSubmit: handleSubmitBulkBatch,
    reset: resetBulkBatch,
    clearErrors: clearBulkBatchErrors,
  } = useForm<BulkBatchFormData>({
    defaultValues: {
      batchNumber: '',
      deliveryDate: '',
      origin: 'Bauhinia Brewery',
      shippingMethod: '',
      generalNotes: '',
      entries: [],
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
        batchNumber: data.batchNumber || generateBatchNumber(),
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

  // Bulk Batch Functions
  const generateBatchNumber = (): string => {
    const now = new Date();
    const yymmdd = now.getFullYear().toString().slice(-2) + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    
    const dateKey = yymmdd;
    const currentCount = dailyBatchCounters[dateKey] || 0;
    const nextCount = currentCount + 1;
    
    // Update the counter immediately
    setDailyBatchCounters(prev => ({
      ...prev,
      [dateKey]: nextCount
    }));
    
    const batchSequence = String(nextCount).padStart(3, '0');
    return `BAU-${yymmdd}-${batchSequence}`;
  };

  const handleOpenBulkBatch = () => {
    const newBatchNumber = generateBatchNumber();
    setCurrentBatchNumber(newBatchNumber);
    setBulkBatchEntries([createEmptyBulkEntry()]);
    setIsBulkBatchModalOpen(true);
    clearBulkBatchErrors();
    
    // Reset form with auto-generated batch number
    resetBulkBatch({
      batchNumber: newBatchNumber,
      deliveryDate: '',
      origin: 'Bauhinia Brewery',
      shippingMethod: '',
      generalNotes: '',
      entries: [],
    });
  };

  const createEmptyBulkEntry = (): BulkSupplyEntry => ({
    id: generateId(),
    productId: '',
    productName: '',
    quantity: 0,
    baseCost: 0,
    shippingCost: 0,
    additionalCosts: 0,
    supplier: 'Bauhinia Brewery',
    notes: '',
  });

  const handleAddBulkEntry = () => {
    setBulkBatchEntries(prev => [...prev, createEmptyBulkEntry()]);
  };

  const handleRemoveBulkEntry = (entryId: string) => {
    setBulkBatchEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const handleUpdateBulkEntry = (entryId: string, field: keyof BulkSupplyEntry, value: any) => {
    setBulkBatchEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, [field]: value } : entry
    ));
  };

  const handleViewBatchHistory = () => {
    setIsBatchHistoryModalOpen(true);
    setBatchCurrentPage(1); // Reset to first page when opening
  };

  // Batch History Filtering and Sorting Functions
  const getFilteredAndSortedBatchHistory = () => {
    let filtered = [...batchHistory];

    // Apply search filter
    if (batchSearchTerm) {
      filtered = filtered.filter(batch =>
        batch.batchNumber.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
        batch.origin?.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
        batch.shippingMethod?.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
        batch.generalNotes?.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
        batch.products.some(product => 
          product.productName.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
          product.supplier.toLowerCase().includes(batchSearchTerm.toLowerCase())
        )
      );
    }

    // Apply date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (batchDateFilter) {
      case 'today':
        filtered = filtered.filter(batch => {
          const batchDate = new Date(batch.processedDate);
          const batchDay = new Date(batchDate.getFullYear(), batchDate.getMonth(), batchDate.getDate());
          return batchDay.getTime() === today.getTime();
        });
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(batch => new Date(batch.processedDate) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        filtered = filtered.filter(batch => new Date(batch.processedDate) >= monthAgo);
        break;
      case 'custom':
        if (batchDateFrom) {
          filtered = filtered.filter(batch => new Date(batch.processedDate) >= new Date(batchDateFrom));
        }
        if (batchDateTo) {
          filtered = filtered.filter(batch => new Date(batch.processedDate) <= new Date(batchDateTo + 'T23:59:59'));
        }
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (batchSortField) {
        case 'processedDate':
        case 'deliveryDate':
          aValue = new Date(a[batchSortField]);
          bValue = new Date(b[batchSortField]);
          break;
        case 'batchNumber':
          aValue = a.batchNumber;
          bValue = b.batchNumber;
          break;
        case 'totalInvestment':
        case 'totalProducts':
        case 'totalUnits':
          aValue = a[batchSortField];
          bValue = b[batchSortField];
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return batchSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return batchSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const getBatchHistorySummary = () => {
    const filtered = getFilteredAndSortedBatchHistory();
    
    return {
      totalBatches: filtered.length,
      totalProducts: filtered.reduce((sum, batch) => sum + batch.totalProducts, 0),
      totalUnits: filtered.reduce((sum, batch) => sum + batch.totalUnits, 0),
      totalInvestment: filtered.reduce((sum, batch) => sum + batch.totalInvestment, 0),
      avgBatchSize: filtered.length > 0 ? filtered.reduce((sum, batch) => sum + batch.totalUnits, 0) / filtered.length : 0,
      avgInvestment: filtered.length > 0 ? filtered.reduce((sum, batch) => sum + batch.totalInvestment, 0) / filtered.length : 0,
      dateRange: {
        earliest: filtered.length > 0 ? filtered.reduce((earliest, batch) => 
          new Date(batch.processedDate) < new Date(earliest.processedDate) ? batch : earliest
        ).processedDate : null,
        latest: filtered.length > 0 ? filtered.reduce((latest, batch) => 
          new Date(batch.processedDate) > new Date(latest.processedDate) ? batch : latest
        ).processedDate : null
      }
    };
  };

  const getPaginatedBatchHistory = () => {
    const filtered = getFilteredAndSortedBatchHistory();
    const startIndex = (batchCurrentPage - 1) * batchItemsPerPage;
    const endIndex = startIndex + batchItemsPerPage;
    
    return {
      data: filtered.slice(startIndex, endIndex),
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / batchItemsPerPage),
      currentPage: batchCurrentPage
    };
  };

  const handleBatchSort = (field: typeof batchSortField) => {
    if (batchSortField === field) {
      setBatchSortDirection(batchSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setBatchSortField(field);
      setBatchSortDirection('desc');
    }
    setBatchCurrentPage(1);
  };

  const clearBatchFilters = () => {
    setBatchSearchTerm('');
    setBatchDateFilter('all');
    setBatchDateFrom('');
    setBatchDateTo('');
    setBatchSortField('processedDate');
    setBatchSortDirection('desc');
    setBatchCurrentPage(1);
  };

  const toggleBatchExpansion = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const handleExportBatchHistory = () => {
    try {
      const filtered = getFilteredAndSortedBatchHistory();
      const summary = getBatchHistorySummary();
      
      if (filtered.length === 0) {
        showToast.warning('No batch history available to export');
        return;
      }

      const csvHeaders = [
        'Batch ID',
        'Batch Number', 
        'Delivery Date',
        'Processed Date',
        'Origin',
        'Shipping Method',
        'Total Products',
        'Total Units',
        'Total Investment',
        'Average Cost Per Unit',
        'Product Name',
        'Product Type',
        'Quantity',
        'Base Cost',
        'Shipping Cost',
        'Additional Costs',
        'Total Cost',
        'Supplier',
        'Product Notes',
        'General Notes'
      ];

      const csvRows: string[][] = [];
      
      filtered.forEach(batch => {
        const avgCostPerUnit = batch.totalUnits > 0 ? batch.totalInvestment / batch.totalUnits : 0;
        
        batch.products.forEach((product, index) => {
          csvRows.push([
            batch.id,
            batch.batchNumber,
            batch.deliveryDate || '',
            batch.processedDate,
            batch.origin || '',
            batch.shippingMethod || '',
            index === 0 ? batch.totalProducts.toString() : '',
            index === 0 ? batch.totalUnits.toString() : '',
            index === 0 ? formatPeso(batch.totalInvestment) : '',
            index === 0 ? formatPeso(avgCostPerUnit) : '',
            product.productName,
            product.productType,
            product.quantity.toString(),
            formatPeso(product.baseCost),
            formatPeso(product.shippingCost),
            formatPeso(product.additionalCosts),
            formatPeso(product.totalCost),
            product.supplier,
            product.notes || '',
            index === 0 ? (batch.generalNotes || '') : ''
          ]);
        });
      });

      // Add summary section
      const summaryRows: string[][] = [
        [''],
        ['BATCH HISTORY SUMMARY'],
        ['Total Batches', summary.totalBatches.toString()],
        ['Total Products Delivered', summary.totalProducts.toString()],
        ['Total Units Delivered', summary.totalUnits.toString()],
        ['Total Investment', formatPeso(summary.totalInvestment)],
        ['Average Batch Size', Math.round(summary.avgBatchSize).toString()],
        ['Average Investment per Batch', formatPeso(summary.avgInvestment)],
        ['Date Range', summary.dateRange.earliest && summary.dateRange.latest ? 
          `${new Date(summary.dateRange.earliest).toLocaleDateString()} - ${new Date(summary.dateRange.latest).toLocaleDateString()}` : 
          'No data'
        ],
        ['Export Date', new Date().toLocaleDateString()],
        ['Search Filter', batchSearchTerm || 'None'],
        ['Date Filter', batchDateFilter],
        ['Sort Field', batchSortField],
        ['Sort Direction', batchSortDirection]
      ];

      const csvContent = arrayToCSV([csvHeaders, ...csvRows, ...summaryRows]);
      const filterSuffix = batchSearchTerm || batchDateFilter !== 'all' ? '-filtered' : '';
      const filename = `batch-history${filterSuffix}-${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCSV(csvContent, filename);
      showToast.success(`Batch history exported successfully (${filtered.length} records)`);
    } catch (error) {
      console.error('Error exporting batch history:', error);
      showToast.error('Failed to export batch history. Please try again.');
    }
  };

  const handleBulkBatchSubmit = async (data: BulkBatchFormData) => {
    const loadingToastId = showToast.loading('Processing bulk batch...');
    
    try {
      const validEntries = bulkBatchEntries.filter(entry => 
        entry.productId && entry.quantity > 0 && entry.baseCost > 0
      );

      if (validEntries.length === 0) {
        showToast.update(loadingToastId, 'No valid entries to process', 'warning');
        return;
      }

      const batchId = generateBatchId();
      const currentDate = new Date();
      const updatedStocks = [...stocks];
      const processedEntries: Array<{stock: Required<BeerStock>, entry: SupplyEntry}> = [];

      // Process each entry
      for (const bulkEntry of validEntries) {
        const stockIndex = updatedStocks.findIndex(s => s.id === bulkEntry.productId);
        if (stockIndex === -1) continue;

        const stock = updatedStocks[stockIndex];
        const quantity = safeNumber(bulkEntry.quantity);
        const baseCost = safeNumber(bulkEntry.baseCost);
        const shippingCost = safeNumber(bulkEntry.shippingCost);
        const additionalCosts = safeNumber(bulkEntry.additionalCosts);
        
        const newSupplyTotalCost = calculateTotalCost(baseCost, shippingCost, additionalCosts);
        const newAverageCost = calculateWeightedAverageCost(
          stock.quantity,
          stock.totalCost,
          quantity,
          newSupplyTotalCost
        );
        const roundedAverageCost = roundToDecimal(newAverageCost);
        const combinedQuantity = stock.quantity + quantity;

        // Calculate batch comparison
        let comparisonToPrevious;
        if (stock.supplyHistory.length > 0) {
          const lastSupply = stock.supplyHistory[0];
          comparisonToPrevious = calculateBatchComparison(
            baseCost, shippingCost, additionalCosts,
            lastSupply.baseCost, lastSupply.shippingCost, lastSupply.additionalCosts
          );
        }

        const supplyEntry: SupplyEntry = {
          id: generateId(),
          date: currentDate.toISOString(),
          quantity,
          baseCost,
          shippingCost,
          additionalCosts,
          totalCost: newSupplyTotalCost,
          notes: bulkEntry.notes || data.generalNotes,
          supplier: bulkEntry.supplier,
          profitMargin: calculateProfitMargin(stock.sellingPrice, roundedAverageCost),
          priceChange: 0,
          averageCostChange: roundedAverageCost - stock.totalCost,
          wasAutoCalculated: true,
          priceLockChanged: false,
          // Enhanced batch tracking
          batchId: `${batchId}-${bulkEntry.productName.substring(0, 3).toUpperCase()}`,
          batchNumber: data.batchNumber || currentBatchNumber,
          deliveryDate: data.deliveryDate,
          origin: data.origin,
          shippingMethod: data.shippingMethod,
          reasonForCostChange: `Bulk batch delivery: ${data.generalNotes || 'Regular supply delivery'}`,
          comparisonToPrevious
        };

        // Calculate new selling price if not locked
        let newSellingPrice = stock.sellingPrice;
        if (!stock.isPriceLocked) {
          newSellingPrice = calculateSellingPrice(
            roundedAverageCost,
            stock.markup,
            stock.isMarkupPercentage
          );
          newSellingPrice = roundToDecimal(newSellingPrice);
        }

        // Update the stock
        updatedStocks[stockIndex] = {
          ...stock,
          quantity: combinedQuantity,
          baseCost: roundedAverageCost,
          totalCost: roundedAverageCost,
          sellingPrice: newSellingPrice,
          available: true,
          supplyHistory: [supplyEntry, ...stock.supplyHistory],
        };

        processedEntries.push({ stock: updatedStocks[stockIndex], entry: supplyEntry });
      }

      // Update all stocks at once
      setStocks(updatedStocks);

      // Generate success message
      const totalUnits = processedEntries.reduce((sum, {entry}) => sum + entry.quantity, 0);
      const totalProducts = processedEntries.length;
      const totalInvestment = processedEntries.reduce((sum, {entry}) => sum + (entry.quantity * entry.totalCost), 0);

      // Record batch history
      const batchHistoryRecord: BatchHistoryRecord = {
        id: batchId,
        batchNumber: data.batchNumber || currentBatchNumber,
        deliveryDate: data.deliveryDate || '',
        processedDate: currentDate.toISOString(),
        origin: data.origin,
        shippingMethod: data.shippingMethod,
        generalNotes: data.generalNotes,
        totalProducts,
        totalUnits,
        totalInvestment,
        products: processedEntries.map(({stock, entry}) => ({
          productId: stock.id,
          productName: stock.name,
          productType: stock.type,
          quantity: entry.quantity,
          baseCost: entry.baseCost,
          shippingCost: entry.shippingCost,
          additionalCosts: entry.additionalCosts,
          totalCost: entry.totalCost,
          supplier: entry.supplier || '',
          notes: entry.notes
        }))
      };

      setBatchHistory(prev => [batchHistoryRecord, ...prev]);

      showToast.update(
        loadingToastId, 
        `Successfully processed bulk batch: ${totalProducts} products, ${totalUnits} total units, ${formatPeso(totalInvestment)} investment`, 
        'success'
      );

      setIsBulkBatchModalOpen(false);
      setBulkBatchEntries([]);
      setCurrentBatchNumber('');
      clearBulkBatchErrors();
      resetBulkBatch();
    } catch (error) {
      console.error('Error processing bulk batch:', error);
      showToast.update(loadingToastId, 'Failed to process bulk batch', 'error');
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
        <div className="flex space-x-3">
          <button
            onClick={handleViewBatchHistory}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-all duration-200 font-gotham flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Batch History
          </button>
          <button
            onClick={handleOpenBulkBatch}
            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 font-gotham flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Supply Batch
          </button>
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
                            min: { value: 0.01, message: 'Base cost must be greater than 0' }
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
                            min: { value: 0, message: 'Shipping cost must be non-negative' }
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
                            min: { value: 0, message: 'Additional costs must be non-negative' }
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
                            min: { value: 0.01, message: 'Base cost must be greater than 0' }
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
                            min: { value: 0, message: 'Shipping cost must be non-negative' }
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
                            min: { value: 0, message: 'Additional costs must be non-negative' }
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

      {/* Bulk Batch Modal */}
      {isBulkBatchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white font-sansation">
                  Add Supply Batch - Multiple Products
                </h3>
                <button
                  onClick={() => {
                    setIsBulkBatchModalOpen(false);
                    setBulkBatchEntries([]);
                    setCurrentBatchNumber('');
                    clearBulkBatchErrors();
                    resetBulkBatch();
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitBulkBatch(handleBulkBatchSubmit)} className="p-6">
              {/* Batch Information */}
              <div className="mb-6 bg-blue-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd"/>
                  </svg>
                  Batch Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number
                    </label>
                    <input
                      {...registerBulkBatch('batchNumber')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="BAU-YYMMDD-XXX format"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Format: BAU-{new Date().getFullYear().toString().slice(-2)}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}-XXX (auto-generated)
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      {...registerBulkBatch('deliveryDate')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Origin/Source
                    </label>
                    <input
                      {...registerBulkBatch('origin')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Bauhinia Brewery"
                      defaultValue="Bauhinia Brewery"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipping Method
                    </label>
                    <select
                      {...registerBulkBatch('shippingMethod')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Notes
                  </label>
                  <textarea
                    {...registerBulkBatch('generalNotes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="General notes for this batch delivery"
                  />
                </div>
              </div>

              {/* Product Entries */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Product Entries</h4>
                  <button
                    type="button"
                    onClick={handleAddBulkEntry}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Another Product
                  </button>
                </div>

                <div className="space-y-4">
                  {bulkBatchEntries.map((entry, index) => (
                    <div key={entry.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <h5 className="text-md font-medium text-gray-900">Product #{index + 1}</h5>
                        {bulkBatchEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBulkEntry(entry.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product *
                          </label>
                          <select
                            value={entry.productId}
                            onChange={(e) => {
                              const selectedStock = stocks.find(s => s.id === e.target.value);
                              handleUpdateBulkEntry(entry.id, 'productId', e.target.value);
                              handleUpdateBulkEntry(entry.id, 'productName', selectedStock?.name || '');
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            disabled={isLoading}
                          >
                            <option value="">
                              {isLoading ? 'Loading products...' : 'Select product from current inventory'}
                            </option>
                            {!isLoading && stocks.map(stock => (
                              <option key={stock.id} value={stock.id}>
                                {stock.name} ({stock.type}) - Current Stock: {stock.quantity} units
                              </option>
                            ))}
                          </select>
                          {!isLoading && stocks.length === 0 && (
                            <p className="mt-1 text-sm text-amber-600">No products available in inventory</p>
                          )}
                          {isLoading && (
                            <p className="mt-1 text-sm text-gray-500">Loading inventory data...</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            value={entry.quantity}
                            onChange={(e) => handleUpdateBulkEntry(entry.id, 'quantity', safeNumber(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0"
                            min="1"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Base Cost (₱) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.baseCost}
                            onChange={(e) => handleUpdateBulkEntry(entry.id, 'baseCost', safeNumber(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0.00"
                            min="0.01"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Shipping Cost (₱)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.shippingCost}
                            onChange={(e) => handleUpdateBulkEntry(entry.id, 'shippingCost', safeNumber(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0.00"
                            min="0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Costs (₱)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.additionalCosts}
                            onChange={(e) => handleUpdateBulkEntry(entry.id, 'additionalCosts', safeNumber(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0.00"
                            min="0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Supplier
                          </label>
                          <input
                            value={entry.supplier}
                            onChange={(e) => handleUpdateBulkEntry(entry.id, 'supplier', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Supplier name"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Notes
                          </label>
                          <input
                            value={entry.notes}
                            onChange={(e) => handleUpdateBulkEntry(entry.id, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Specific notes for this product"
                          />
                        </div>
                      </div>
                      
                      {/* Cost Summary for this entry */}
                      {entry.quantity > 0 && entry.baseCost > 0 && (
                        <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
                          <div className="text-sm text-green-800">
                            <strong>Total Cost per Unit:</strong> {formatPeso(calculateTotalCost(entry.baseCost, entry.shippingCost, entry.additionalCosts))} | 
                            <strong> Total Investment:</strong> {formatPeso(entry.quantity * calculateTotalCost(entry.baseCost, entry.shippingCost, entry.additionalCosts))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Batch Summary */}
              {bulkBatchEntries.some(entry => entry.quantity > 0 && entry.baseCost > 0) && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-lg font-semibold text-yellow-900 mb-3">Batch Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-yellow-800">Products:</span> {bulkBatchEntries.filter(entry => entry.productId && entry.quantity > 0).length}
                    </div>
                    <div>
                      <span className="font-medium text-yellow-800">Total Units:</span> {bulkBatchEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0)}
                    </div>
                    <div>
                      <span className="font-medium text-yellow-800">Total Investment:</span> {formatPeso(bulkBatchEntries.reduce((sum, entry) => sum + (entry.quantity * calculateTotalCost(entry.baseCost, entry.shippingCost, entry.additionalCosts)), 0))}
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
                    onClick={() => {
                      setIsBulkBatchModalOpen(false);
                      setBulkBatchEntries([]);
                      setCurrentBatchNumber('');
                      clearBulkBatchErrors();
                      resetBulkBatch();
                    }}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
                  >
                    Process Batch
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Batch History Modal */}
      {isBatchHistoryModalOpen && (() => {
        const paginatedData = getPaginatedBatchHistory();
        const summary = getBatchHistorySummary();
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-screen overflow-y-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-white font-sansation">
                      Batch History - Bulk Supply Deliveries
                    </h3>
                    <p className="text-purple-100 text-sm mt-1">
                      Comprehensive tracking of all batch deliveries
                    </p>
                  </div>
                  <button
                    onClick={() => setIsBatchHistoryModalOpen(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {batchHistory.length > 0 ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-900">Total Batches</div>
                        <div className="text-2xl font-bold text-blue-700">{summary.totalBatches}</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-900">Total Products</div>
                        <div className="text-2xl font-bold text-green-700">{summary.totalProducts}</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="text-sm font-medium text-purple-900">Total Units</div>
                        <div className="text-2xl font-bold text-purple-700">{summary.totalUnits}</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="text-sm font-medium text-yellow-900">Total Investment</div>
                        <div className="text-lg font-bold text-yellow-700">{formatPeso(summary.totalInvestment)}</div>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <div className="text-sm font-medium text-indigo-900">Avg Batch Size</div>
                        <div className="text-2xl font-bold text-indigo-700">{Math.round(summary.avgBatchSize)}</div>
                      </div>
                      <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                        <div className="text-sm font-medium text-pink-900">Avg Investment</div>
                        <div className="text-lg font-bold text-pink-700">{formatPeso(summary.avgInvestment)}</div>
                      </div>
                    </div>

                    {/* Filters and Search */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Search
                          </label>
                          <input
                            type="text"
                            value={batchSearchTerm}
                            onChange={(e) => setBatchSearchTerm(e.target.value)}
                            placeholder="Search batch, product, supplier..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          />
                        </div>

                        {/* Date Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Filter
                          </label>
                          <select
                            value={batchDateFilter}
                            onChange={(e) => setBatchDateFilter(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                          </select>
                        </div>

                        {/* Custom Date Range */}
                        {batchDateFilter === 'custom' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                From Date
                              </label>
                              <input
                                type="date"
                                value={batchDateFrom}
                                onChange={(e) => setBatchDateFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                To Date
                              </label>
                              <input
                                type="date"
                                value={batchDateTo}
                                onChange={(e) => setBatchDateTo(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                              />
                            </div>
                          </>
                        )}

                        {/* Clear Filters */}
                        <div className="flex items-end">
                          <button
                            onClick={clearBatchFilters}
                            className="w-full px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-sm font-medium text-gray-700 self-center">Sort by:</span>
                      {[
                        { field: 'processedDate' as const, label: 'Processed Date' },
                        { field: 'deliveryDate' as const, label: 'Delivery Date' },
                        { field: 'batchNumber' as const, label: 'Batch Number' },
                        { field: 'totalInvestment' as const, label: 'Investment' },
                        { field: 'totalProducts' as const, label: 'Products' },
                        { field: 'totalUnits' as const, label: 'Units' }
                      ].map(({ field, label }) => (
                        <button
                          key={field}
                          onClick={() => handleBatchSort(field)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            batchSortField === field
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {label}
                          {batchSortField === field && (
                            <span className="ml-1">
                              {batchSortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Bulk Expand/Collapse Controls */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-gray-600">
                        {paginatedData.data.length} batch{paginatedData.data.length !== 1 ? 'es' : ''} on this page
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const allBatchIds = paginatedData.data.map(batch => batch.id);
                            setExpandedBatches(new Set(allBatchIds));
                          }}
                          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                        >
                          Expand All
                        </button>
                        <button
                          onClick={() => setExpandedBatches(new Set())}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Batch List */}
                    <div className="space-y-4">
                      {paginatedData.data.map((batch) => {
                        const isExpanded = expandedBatches.has(batch.id);
                        
                        return (
                          <div key={batch.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {/* Compact Header - Always Visible */}
                            <div 
                              className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleBatchExpansion(batch.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4">
                                    {/* Expand/Collapse Icon */}
                                    <div className="flex-shrink-0">
                                      <svg 
                                        className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                                          isExpanded ? 'rotate-90' : ''
                                        }`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                    
                                    {/* Batch Info */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                                        {batch.batchNumber}
                                      </h4>
                                      <div className="flex items-center space-x-6 text-sm text-gray-600 mt-1">
                                        <span>
                                          <span className="font-medium">Delivered:</span> {batch.deliveryDate ? new Date(batch.deliveryDate).toLocaleDateString() : 'Not specified'}
                                        </span>
                                        <span>
                                          <span className="font-medium">Processed:</span> {new Date(batch.processedDate).toLocaleDateString()}
                                        </span>
                                        <span>
                                          <span className="font-medium">Origin:</span> {batch.origin || 'Not specified'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Quick Stats */}
                                <div className="flex items-center space-x-6 text-sm">
                                  <div className="text-center">
                                    <div className="font-semibold text-blue-600">{batch.totalProducts}</div>
                                    <div className="text-gray-500">Products</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-purple-600">{batch.totalUnits}</div>
                                    <div className="text-gray-500">Units</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-green-600">{formatPeso(batch.totalInvestment)}</div>
                                    <div className="text-gray-500">Investment</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-orange-600">{formatPeso(batch.totalInvestment / batch.totalUnits)}</div>
                                    <div className="text-gray-500">Avg/Unit</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details - Conditionally Visible */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 bg-gray-50">
                                <div className="px-6 py-4">
                                  {/* Detailed Information */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Shipping Method:</span><br />
                                      <span className="text-gray-600">{batch.shippingMethod || 'Not specified'}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Batch ID:</span><br />
                                      <span className="text-gray-600 font-mono text-xs">{batch.id}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Processing Time:</span><br />
                                      <span className="text-gray-600">{new Date(batch.processedDate).toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Products/Units Ratio:</span><br />
                                      <span className="text-gray-600">{(batch.totalUnits / batch.totalProducts).toFixed(1)} units/product</span>
                                    </div>
                                  </div>

                                  {/* General Notes */}
                                  {batch.generalNotes && (
                                    <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                                      <div className="text-sm">
                                        <span className="font-medium text-blue-900">Batch Notes:</span>
                                        <span className="text-blue-700 ml-2">{batch.generalNotes}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Products Table */}
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white rounded border border-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Cost</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Additional</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {batch.products.map((product, index) => (
                                          <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                              <div>
                                                <div className="font-medium text-gray-900">{product.productName}</div>
                                                <div className="text-sm text-gray-500">{product.productType}</div>
                                                {product.notes && (
                                                  <div className="text-xs text-gray-400 mt-1">{product.notes}</div>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2 text-gray-900">{product.quantity}</td>
                                            <td className="px-4 py-2 text-gray-900">{formatPeso(product.baseCost)}</td>
                                            <td className="px-4 py-2 text-gray-900">{formatPeso(product.shippingCost)}</td>
                                            <td className="px-4 py-2 text-gray-900">{formatPeso(product.additionalCosts)}</td>
                                            <td className="px-4 py-2 font-medium text-gray-900">{formatPeso(product.totalCost)}</td>
                                            <td className="px-4 py-2 font-medium text-green-600">{formatPeso(product.quantity * product.totalCost)}</td>
                                            <td className="px-4 py-2 text-gray-900">{product.supplier}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {paginatedData.totalPages > 1 && (
                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Showing {((paginatedData.currentPage - 1) * batchItemsPerPage) + 1} to {Math.min(paginatedData.currentPage * batchItemsPerPage, paginatedData.totalItems)} of {paginatedData.totalItems} results
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setBatchCurrentPage(Math.max(1, batchCurrentPage - 1))}
                            disabled={batchCurrentPage === 1}
                            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-2 text-sm text-gray-700">
                            Page {batchCurrentPage} of {paginatedData.totalPages}
                          </span>
                          <button
                            onClick={() => setBatchCurrentPage(Math.min(paginatedData.totalPages, batchCurrentPage + 1))}
                            disabled={batchCurrentPage === paginatedData.totalPages}
                            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No batch history</h3>
                    <p className="mt-1 text-sm text-gray-500">No bulk batch deliveries have been processed yet.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setIsBatchHistoryModalOpen(false);
                          handleOpenBulkBatch();
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
                        </svg>
                        Process First Batch
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    {paginatedData.totalItems > 0 
                      ? `${paginatedData.totalItems} batch record${paginatedData.totalItems !== 1 ? 's' : ''} found`
                      : 'No records found'
                    }
                  </div>
                  <div className="flex space-x-3">
                    {batchHistory.length > 0 && (
                      <button
                        onClick={handleExportBatchHistory}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                      </button>
                    )}
                    <button
                      onClick={() => setIsBatchHistoryModalOpen(false)}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default StockManager; 