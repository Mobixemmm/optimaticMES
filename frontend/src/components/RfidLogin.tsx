import { useState } from 'react';

interface RfidLoginProps {
  onLogin: (operator: { id: number; firstName: string; lastName: string }) => void;
}

export function RfidLogin({ onLogin }: RfidLoginProps) {
  const [rfidInput, setRfidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!rfidInput.trim()) {
      setError('Wpisz numer karty RFID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/operators/login-rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidCardId: rfidInput }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Błąd logowania');
      }

      const data = await response.json();
      onLogin(data.operator);
      setRfidInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">🔑 Logowanie RFID</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          value={rfidInput}
          onChange={(e) => setRfidInput(e.target.value)}
          placeholder="Przybij kartę lub wpisz numer RFID..."
          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Testowe karty: A3F29B1C4D5E (Jan K.), B7E18C2F6A0D (Anna N.), C5D40A9E3B7F (Piotr W.)
      </p>
    </div>
  );
}