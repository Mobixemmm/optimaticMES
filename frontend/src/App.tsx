import { useState, useEffect } from 'react';
import { NewOrderForm } from './components/NewOrderForm';
import { TemperatureWidget } from './components/TemperatureWidget';

interface ProductionOrder {
  id: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  plannedStart: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

function App() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = () => {
    setLoading(true);
    fetch('http://localhost:3001/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Błąd pobierania danych: ' + err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Oczekujące',
      in_progress: 'W trakcie',
      completed: 'Zakończone',
      cancelled: 'Anulowane',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleStart = async (id: number) => {
    await fetch(`http://localhost:3001/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    fetchOrders();
  };

  const handleStop = async (id: number) => {
    await fetch(`http://localhost:3001/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    fetchOrders();
  };

  if (loading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nagłówek */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">OptimaticMES</h1>
          <p className="text-sm text-gray-500">System zarządzania produkcją</p>
        </div>
      </header>

      {/* Główna zawartość */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Widżet temperatury */}
        <TemperatureWidget />

        {/* Formularz nowego zlecenia */}
        <NewOrderForm onOrderCreated={fetchOrders} />

        {/* Tabela zleceń */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nr zlecenia</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Produkt</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ilość</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.productName}</td>
                  <td className="px-4 py-3">{order.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStart(order.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        START
                      </button>
                    )}
                    {order.status === 'in_progress' && (
                      <button
                        onClick={() => handleStop(order.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        STOP
                      </button>
                    )}
                    {order.status === 'completed' && (
                      <span className="text-gray-400 text-sm">Zakończone</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default App;