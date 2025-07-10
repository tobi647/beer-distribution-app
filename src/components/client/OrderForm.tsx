import { useState, useEffect } from 'react';

interface OrderFormProps {
  onSubmit: (orderData: OrderData) => void;
  selectedProduct?: {
    id: string;
    name: string;
    price: number;
  };
}

interface OrderData {
  productId: string;
  quantity: number;
  deliveryAddress: string;
  contactNumber: string;
  specialInstructions?: string;
}

const OrderForm = ({ onSubmit, selectedProduct }: OrderFormProps) => {
  const [formData, setFormData] = useState<OrderData>({
    productId: selectedProduct?.id || '',
    quantity: 1,
    deliveryAddress: '',
    contactNumber: '',
    specialInstructions: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OrderData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when selected product changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      productId: selectedProduct?.id || '',
    }));
  }, [selectedProduct]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof OrderData, string>> = {};

    if (!formData.productId) {
      newErrors.productId = 'Please select a product';
    }

    if (formData.quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }

    if (!formData.deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Delivery address is required';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^\+?[\d\s-]{8,}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid contact number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setFormData({
        productId: '',
        quantity: 1,
        deliveryAddress: '',
        contactNumber: '',
        specialInstructions: '',
      });
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Math.max(1, parseInt(value) || 0) : value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof OrderData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {selectedProduct ? (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900">{selectedProduct.name}</h4>
          <p className="text-sm text-gray-500">
            Price: ${selectedProduct.price.toFixed(2)}
          </p>
        </div>
      ) : (
        <p className="text-gray-500 italic">
          Please select a product from the stock list
        </p>
      )}

      <div>
        <label
          htmlFor="quantity"
          className="block text-sm font-medium text-gray-700"
        >
          Quantity
        </label>
        <input
          type="number"
          name="quantity"
          id="quantity"
          min="1"
          value={formData.quantity}
          onChange={handleInputChange}
          className={`mt-1 block w-full rounded-md shadow-sm ${
            errors.quantity
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`}
        />
        {errors.quantity && (
          <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="deliveryAddress"
          className="block text-sm font-medium text-gray-700"
        >
          Delivery Address
        </label>
        <input
          type="text"
          name="deliveryAddress"
          id="deliveryAddress"
          value={formData.deliveryAddress}
          onChange={handleInputChange}
          className={`mt-1 block w-full rounded-md shadow-sm ${
            errors.deliveryAddress
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`}
        />
        {errors.deliveryAddress && (
          <p className="mt-1 text-sm text-red-600">{errors.deliveryAddress}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="contactNumber"
          className="block text-sm font-medium text-gray-700"
        >
          Contact Number
        </label>
        <input
          type="tel"
          name="contactNumber"
          id="contactNumber"
          value={formData.contactNumber}
          onChange={handleInputChange}
          className={`mt-1 block w-full rounded-md shadow-sm ${
            errors.contactNumber
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`}
          placeholder="+1 234 567 8900"
        />
        {errors.contactNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.contactNumber}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="specialInstructions"
          className="block text-sm font-medium text-gray-700"
        >
          Special Instructions (Optional)
        </label>
        <textarea
          name="specialInstructions"
          id="specialInstructions"
          rows={3}
          value={formData.specialInstructions}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Any special delivery instructions..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !selectedProduct}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isSubmitting || !selectedProduct
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>
    </form>
  );
};

export default OrderForm; 