// Mock data constants - centralized for reuse across components
// This will be replaced with actual API calls in production

export interface BeerStock {
  id: string;
  name: string;
  type: string;
  quantity: number;
  sellingPrice: number;
  available: boolean;
  // Admin-specific fields
  baseCost?: number;
  shippingCost?: number;
  additionalCosts?: number;
  markup?: number;
  isMarkupPercentage?: boolean;
  totalCost?: number;
  isPriceLocked?: boolean;
  minimumStock?: number;
  supplier?: string;
  supplyHistory?: SupplyEntry[];
}

export interface SupplyEntry {
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
  // Enhanced batch tracking fields
  batchId: string;
  batchNumber?: string;
  deliveryDate?: string;
  origin?: string;
  shippingMethod?: string;
  reasonForCostChange?: string;
  comparisonToPrevious?: {
    baseCostDiff: number;
    shippingCostDiff: number;
    additionalCostsDiff: number;
    totalCostDiff: number;
    percentageChange: number;
  };
}

export interface Order {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
  deliveryAddress: string;
}

// Mock stock data for admin view (full details)
export const mockAdminStocks: Required<BeerStock>[] = [
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
        notes: 'Good quality batch with premium hops',
        supplier: 'Craft Beer Co.',
        profitMargin: 28.5,
        priceChange: 0.15,
        averageCostChange: 0.25,
        wasAutoCalculated: true,
        priceLockChanged: false,
        batchId: 'BATCH-2023-10-20-001',
        batchNumber: 'PL-2023-42',
        deliveryDate: '2023-10-20',
        origin: 'Munich, Germany',
        shippingMethod: 'Sea Freight + Refrigerated Truck',
        reasonForCostChange: 'Premium hops and increased shipping costs due to fuel prices',
        comparisonToPrevious: {
          baseCostDiff: 0.10,
          shippingCostDiff: 0.10,
          additionalCostsDiff: 0.05,
          totalCostDiff: 0.25,
          percentageChange: 7.8,
        },
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
        notes: 'Quick delivery, express shipping due to urgent demand',
        supplier: 'Premium Breweries Ltd',
        profitMargin: 31.2,
        priceChange: 0.20,
        averageCostChange: 0.25,
        wasAutoCalculated: true,
        priceLockChanged: false,
        batchId: 'BATCH-2023-10-19-002',
        batchNumber: 'IPA-2023-43',
        deliveryDate: '2023-10-19',
        origin: 'Portland, Oregon, USA',
        shippingMethod: 'Air Freight Express',
        reasonForCostChange: 'Express shipping required for urgent restocking, premium craft ingredients',
        comparisonToPrevious: {
          baseCostDiff: 0.10,
          shippingCostDiff: 0.10,
          additionalCostsDiff: 0.05,
          totalCostDiff: 0.25,
          percentageChange: 6.3,
        },
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

// Mock stock data for client view (limited details)
export const mockClientStocks: BeerStock[] = mockAdminStocks.map(stock => ({
  id: stock.id,
  name: stock.name,
  type: stock.type,
  quantity: stock.quantity,
  sellingPrice: stock.sellingPrice,
  available: stock.available,
}));

// Mock order history
export const mockOrders: Order[] = [
  {
    id: '1',
    productName: 'Premium Lager',
    quantity: 50,
    totalPrice: 224.00,
    orderDate: '2024-03-15T10:30:00Z',
    status: 'delivered',
    deliveryAddress: '123 Main St, City, Country',
  },
  {
    id: '2',
    productName: 'Craft IPA',
    quantity: 30,
    totalPrice: 174.00,
    orderDate: '2024-03-14T15:45:00Z',
    status: 'processing',
    deliveryAddress: '456 Oak Ave, City, Country',
  },
  {
    id: '3',
    productName: 'Seasonal Ale',
    quantity: 25,
    totalPrice: 121.50,
    orderDate: '2024-03-13T09:15:00Z',
    status: 'pending',
    deliveryAddress: '789 Pine Rd, City, Country',
  },
];

// Simulation delay for API-like behavior
export const MOCK_API_DELAY = 1000; 