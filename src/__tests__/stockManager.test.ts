import { describe, it, expect, beforeEach } from 'vitest';

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

interface AddSupplyFormData {
  quantity: number;
  baseCost: number;
  shippingCost: number;
  additionalCosts: number;
  notes?: string;
  supplier?: string;
}

// Helper functions from StockManager component
const calculateTotalCost = (baseCost: number, shippingCost: number, additionalCosts: number): number => {
  return baseCost + shippingCost + additionalCosts;
};

const calculateSellingPrice = (totalCost: number, markup: number, isMarkupPercentage: boolean): number => {
  return isMarkupPercentage ? totalCost * (1 + markup / 100) : totalCost + markup;
};

const calculatePreview = (stock: BeerStock, data: AddSupplyFormData) => {
  if (!stock || !data.quantity || !data.baseCost) return null;

  const newSupplyTotalCost = calculateTotalCost(
    data.baseCost,
    data.shippingCost || 0,
    data.additionalCosts || 0
  );

  const existingTotalValue = stock.totalCost * stock.quantity;
  const newSupplyTotalValue = newSupplyTotalCost * data.quantity;
  const combinedQuantity = stock.quantity + data.quantity;
  const newAverageCostPerUnit = (existingTotalValue + newSupplyTotalValue) / combinedQuantity;
  const roundedAverageCost = Math.round(newAverageCostPerUnit * 100) / 100;

  const newSellingPrice = stock.isPriceLocked
    ? stock.sellingPrice
    : stock.isMarkupPercentage
      ? roundedAverageCost * (1 + stock.markup / 100)
      : roundedAverageCost + stock.markup;

  const profitMargin = ((newSellingPrice - roundedAverageCost) / roundedAverageCost) * 100;

  return {
    newQuantity: combinedQuantity,
    newAverageCost: roundedAverageCost,
    newSellingPrice: Math.round(newSellingPrice * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
};

// Mock data
const mockStock: BeerStock = {
  id: 'test1',
  name: 'Test Beer',
  type: 'Lager',
  quantity: 100,
  baseCost: 10,
  shippingCost: 2,
  additionalCosts: 1,
  markup: 30,
  isMarkupPercentage: true,
  totalCost: 13, // 10 + 2 + 1
  sellingPrice: 16.90, // 13 * (1 + 30/100)
  isPriceLocked: false,
  available: true,
  minimumStock: 20,
  supplier: 'Test Supplier',
  supplyHistory: []
};

describe('Stock Management Calculations', () => {
  describe('Basic Cost Calculations', () => {
    it('should correctly calculate total cost', () => {
      const result = calculateTotalCost(10, 2, 1);
      expect(result).toBe(13);
    });

    it('should correctly calculate selling price with percentage markup', () => {
      const result = calculateSellingPrice(13, 30, true);
      expect(result).toBeCloseTo(16.90, 2);
    });

    it('should correctly calculate selling price with fixed markup', () => {
      const result = calculateSellingPrice(13, 5, false);
      expect(result).toBe(18);
    });
  });

  describe('Price Lock Functionality', () => {
    let stock: BeerStock;
    
    beforeEach(() => {
      stock = { ...mockStock };
    });

    it('should maintain locked price when costs change', () => {
      stock.isPriceLocked = true;
      const lockedPrice = 20;
      stock.sellingPrice = lockedPrice;
      
      const preview = calculatePreview(stock, {
        quantity: 50,
        baseCost: 15, // Higher base cost
        shippingCost: 2,
        additionalCosts: 1
      });

      expect(preview?.newSellingPrice).toBe(lockedPrice);
    });

    it('should recalculate price when unlocked', () => {
      stock.isPriceLocked = false;
      
      const preview = calculatePreview(stock, {
        quantity: 50,
        baseCost: 15,
        shippingCost: 2,
        additionalCosts: 1
      });

      // Calculate expected values
      const newSupplyTotalCost = 18; // 15 + 2 + 1
      const oldTotalValue = stock.totalCost * stock.quantity; // 13 * 100
      const newSupplyTotalValue = newSupplyTotalCost * 50;
      const combinedQuantity = stock.quantity + 50;
      const expectedNewCost = (oldTotalValue + newSupplyTotalValue) / combinedQuantity;
      const expectedNewPrice = expectedNewCost * (1 + stock.markup / 100);
      
      expect(preview?.newSellingPrice).toBeCloseTo(Math.round(expectedNewPrice * 100) / 100, 2);
    });
  });

  describe('Margin Calculations', () => {
    it('should correctly calculate profit margin', () => {
      const totalCost = 13;
      const sellingPrice = 16.90;
      const margin = ((sellingPrice - totalCost) / totalCost) * 100;
      expect(margin).toBeCloseTo(30, 1);
    });

    it('should identify low margin (<10%)', () => {
      const totalCost = 13;
      const sellingPrice = 14;
      const margin = ((sellingPrice - totalCost) / totalCost) * 100;
      expect(margin).toBeLessThan(10);
    });

    it('should identify moderate margin (10-20%)', () => {
      const totalCost = 13;
      const sellingPrice = 15;
      const margin = ((sellingPrice - totalCost) / totalCost) * 100;
      expect(margin).toBeGreaterThanOrEqual(10);
      expect(margin).toBeLessThan(20);
    });

    it('should identify healthy margin (>20%)', () => {
      const totalCost = 13;
      const sellingPrice = 16.90;
      const margin = ((sellingPrice - totalCost) / totalCost) * 100;
      expect(margin).toBeGreaterThan(20);
    });
  });

  describe('Supply Addition Calculations', () => {
    let stock: BeerStock;
    
    beforeEach(() => {
      stock = { ...mockStock };
    });

    it('should correctly calculate new average cost after supply addition', () => {
      const preview = calculatePreview(stock, {
        quantity: 50,
        baseCost: 12,
        shippingCost: 2,
        additionalCosts: 1
      });

      const oldTotalValue = stock.totalCost * stock.quantity;
      const newSupplyTotalCost = 15; // 12 + 2 + 1
      const newSupplyTotalValue = newSupplyTotalCost * 50;
      const expectedAverageCost = (oldTotalValue + newSupplyTotalValue) / (stock.quantity + 50);

      expect(preview?.newAverageCost).toBeCloseTo(expectedAverageCost, 2);
    });

    it('should correctly update quantity after supply addition', () => {
      const preview = calculatePreview(stock, {
        quantity: 50,
        baseCost: 12,
        shippingCost: 2,
        additionalCosts: 1
      });

      expect(preview?.newQuantity).toBe(150); // 100 + 50
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero costs', () => {
      const result = calculateTotalCost(0, 0, 0);
      expect(result).toBe(0);
    });

    it('should handle zero markup', () => {
      const result = calculateSellingPrice(13, 0, true);
      expect(result).toBe(13);
    });

    it('should handle negative markup', () => {
      const result = calculateSellingPrice(13, -10, true);
      expect(result).toBeCloseTo(11.70, 2); // 13 * (1 - 0.1)
    });

    it('should handle very large numbers', () => {
      const result = calculateTotalCost(999999.99, 999999.99, 999999.99);
      expect(result).toBeCloseTo(2999999.97, 2);
    });

    it('should handle fractional quantities', () => {
      const preview = calculatePreview(mockStock, {
        quantity: 0.5,
        baseCost: 10,
        shippingCost: 2,
        additionalCosts: 1
      });

      expect(preview?.newQuantity).toBe(100.5);
    });
  });
}); 