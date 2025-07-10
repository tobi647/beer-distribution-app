import { useState } from 'react';
import type { FormEvent } from 'react';

interface OrderFormProps {
  onSubmit: (order: {
    beerType: string;
    quantity: number;
    deliveryAddress: string;
    notes: string;
  }) => void;
}

const OrderForm = ({ onSubmit }: OrderFormProps) => {
  const [formData, setFormData] = useState({
    beerType: '',
    quantity: 1,
    deliveryAddress: '',
    notes: '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const beerTypes = [
    'Pilsner',
    'German Lager',
    'India Pale Lager',
    'White Lager'
  ];

  return (
    <form 
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-4"
      style={{ fontFamily: 'Gotham Medium, sans-serif' }}
    >
      <h2 
        className="text-2xl mb-6 font-bold"
        style={{ fontFamily: 'Gotham Bold, sans-serif' }}
      >
        Place Your Order
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-bold" htmlFor="beerType">
            Beer Type
          </label>
          <select
            id="beerType"
            value={formData.beerType}
            onChange={(e) => setFormData({ ...formData, beerType: e.target.value })}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE202E]"
            required
          >
            <option value="">Select a beer type</option>
            {beerTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 font-bold" htmlFor="quantity">
            Quantity
          </label>
          <input
            type="number"
            id="quantity"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE202E]"
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-bold" htmlFor="deliveryAddress">
            Delivery Address
          </label>
          <textarea
            id="deliveryAddress"
            value={formData.deliveryAddress}
            onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE202E]"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-bold" htmlFor="notes">
            Special Instructions (Optional)
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE202E]"
            rows={2}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#BE202E] text-white py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all hover:shadow-lg"
        >
          Place Order
        </button>
      </div>
    </form>
  );
};

export default OrderForm; 