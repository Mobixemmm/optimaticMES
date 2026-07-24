import { useState } from 'react';

interface NewOrderFormProps {
  onOrderCreated: () => void;
}

export function NewOrderForm({ onOrderCreated }: NewOrderFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          productName,
          quantity: parseInt(quantity),
          status: 'pending',
          plannedStart: plannedStart ? new Date(plannedStart).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Błąd podczas tworzenia zlecenia');
      }

      // Wyczyść formularz
      setOrderNumber('');
      setProductName('');
      setQuantity('');
      setPlannedStart('');
      setIsOpen(false);
      
      // Powiadom rodzica żeby odświeżył listę
      onOrderCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        + Nowe zlecenie
      </button>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Nowe zlecenie produkcyjne</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numer zlecenia
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="np. Z-2026-004"
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nazwa produktu
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="np. Śruba M6x20"
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ilość
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="np. 1000"
            required
            min="1"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Planowana data rozpoczęcia
          </label>
          <input
            type="datetime-local"
            value={plannedStart}
            onChange={(e) => setPlannedStart(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Zapisywanie...' : 'Utwórz zlecenie'}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
          >
            Anuluj
          </button>
        </div>
      </form>
    </div>
  );
}