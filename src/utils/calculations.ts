// Utility functions for common business calculations

/**
 * Formats a number as Philippine Peso currency
 */
export const formatPeso = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

/**
 * Formats a number as US Dollar currency (for international compatibility)
 */
export const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Calculates total cost from individual cost components
 */
export const calculateTotalCost = (
  baseCost: number,
  shippingCost: number = 0,
  additionalCosts: number = 0
): number => {
  return baseCost + shippingCost + additionalCosts;
};

/**
 * Calculates selling price based on cost and markup
 */
export const calculateSellingPrice = (
  totalCost: number,
  markup: number,
  isMarkupPercentage: boolean
): number => {
  if (isMarkupPercentage) {
    return totalCost * (1 + markup / 100);
  }
  return totalCost + markup;
};

/**
 * Calculates profit margin percentage
 */
export const calculateProfitMargin = (sellingPrice: number, totalCost: number): number => {
  if (totalCost === 0) return 0;
  return ((sellingPrice - totalCost) / totalCost) * 100;
};

/**
 * Calculates weighted average cost for supply additions
 */
export const calculateWeightedAverageCost = (
  currentQuantity: number,
  currentCost: number,
  newQuantity: number,
  newCost: number
): number => {
  const totalQuantity = currentQuantity + newQuantity;
  if (totalQuantity === 0) return 0;
  
  const currentValue = currentQuantity * currentCost;
  const newValue = newQuantity * newCost;
  return (currentValue + newValue) / totalQuantity;
};

/**
 * Rounds a number to specified decimal places (default 2 for currency)
 */
export const roundToDecimal = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Safely converts a value to number with fallback
 */
export const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

/**
 * Generates a unique ID (simple implementation)
 */
export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

/**
 * Validates if a quantity is sufficient for an order
 */
export const isQuantitySufficient = (available: number, requested: number): boolean => {
  return available >= requested && requested > 0;
};

/**
 * Gets status badge CSS classes based on stock level
 */
export const getStockStatusClass = (quantity: number, minimumStock: number): string => {
  if (quantity === 0) {
    return 'bg-red-100 text-red-800';
  }
  if (quantity <= minimumStock) {
    return 'bg-yellow-100 text-yellow-800';
  }
  return 'bg-green-100 text-green-800';
};

/**
 * Gets order status badge CSS classes
 */
export const getOrderStatusClass = (status: string): string => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Utility function to download data as CSV file
 */
export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Converts array data to CSV format
 */
export const arrayToCSV = (data: (string | number)[][]): string => {
  return data.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
};

/**
 * Generates a unique batch ID with timestamp and sequence
 */
export const generateBatchId = (): string => {
  const date = new Date().toISOString().split('T')[0];
  const time = Date.now().toString().slice(-6);
  return `BATCH-${date}-${time}`;
};

/**
 * Calculates cost comparison between current and previous batch
 */
export const calculateBatchComparison = (
  currentBaseCost: number,
  currentShippingCost: number,
  currentAdditionalCosts: number,
  previousBaseCost: number,
  previousShippingCost: number,
  previousAdditionalCosts: number
) => {
  const currentTotal = calculateTotalCost(currentBaseCost, currentShippingCost, currentAdditionalCosts);
  const previousTotal = calculateTotalCost(previousBaseCost, previousShippingCost, previousAdditionalCosts);
  
  return {
    baseCostDiff: roundToDecimal(currentBaseCost - previousBaseCost),
    shippingCostDiff: roundToDecimal(currentShippingCost - previousShippingCost),
    additionalCostsDiff: roundToDecimal(currentAdditionalCosts - previousAdditionalCosts),
    totalCostDiff: roundToDecimal(currentTotal - previousTotal),
    percentageChange: previousTotal > 0 ? roundToDecimal(((currentTotal - previousTotal) / previousTotal) * 100) : 0
  };
};

/**
 * Formats batch comparison for display
 */
export const formatBatchComparison = (comparison: {
  baseCostDiff: number;
  shippingCostDiff: number;
  additionalCostsDiff: number;
  totalCostDiff: number;
  percentageChange: number;
}): string => {
  const { totalCostDiff, percentageChange } = comparison;
  const sign = totalCostDiff >= 0 ? '+' : '';
  return `${sign}${formatPeso(totalCostDiff)} (${sign}${percentageChange}%)`;
}; 