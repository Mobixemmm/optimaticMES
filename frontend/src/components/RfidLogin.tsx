import { useState } from 'react';

interface RfidLoginProps {
  onLogin: (operator: { id: number; firstName: string; lastName: string }) => void;
}

export function RfidLogin({ onLogin }: RfidLoginProps) {
  const [rfidInput, setRfidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!rfidInput.trim()) { setError('Wpisz numer karty RFID'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('http://localhost:3001/operators/login-rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidCardId: rfidInput }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Błąd'); }
      const data = await res.json();
      onLogin(data.operator);
      setRfidInput('');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
      <h2 className="text-lg font-semibold mb-4">🔑 Logowanie RFID</h2>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="flex gap-3">
        <input type="text" value={rfidInput} onChange={e => setRfidInput(e.target.value)}
          placeholder="Przybij kartę lub wpisz numer RFID..." onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
        <button onClick={handleLogin} disabled={loading}
          className="px-5 py-2.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 text-sm font-medium">
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">Testowe karty: A3F29B1C4D5E (Jan K.), B7E18C2F6A0D (Anna N.), C5D40A9E3B7F (Piotr W.)</p>
    </div>
  );
}