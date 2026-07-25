import { useState } from 'react';
import { MachineDashboard } from './components/MachineDashboard';
import { RfidLogin } from './components/RfidLogin';

interface Operator {
  id: number;
  firstName: string;
  lastName: string;
}

function App() {
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 p-5 flex flex-col gap-1">
        <div className="flex items-center gap-3 font-semibold text-lg mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
          </div>
          OptimaticMES
        </div>

        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 mb-2">Menu</div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-sm relative">
          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-600 rounded-r" />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 text-sm cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Zlecenia
          <span className="ml-auto bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-md font-medium">12+</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 text-sm cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Kalendarz
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 text-sm cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Analityka
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 text-sm cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          Operatorzy
        </div>

        <div className="mt-auto bg-emerald-900 rounded-xl p-4 text-white mt-6">
          <div className="text-sm font-medium mb-1">Pobierz raport OEE</div>
          <div className="text-xs opacity-70 mb-3">Eksportuj dane do PDF</div>
          <button className="w-full py-2 bg-emerald-600 rounded-lg text-sm font-medium">Pobierz</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 w-80">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Wyszukaj maszynę lub zlecenie..." className="outline-none text-sm w-full bg-transparent" />
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </button>
            {currentOperator ? (
              <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full">
                <span className="text-green-800 text-sm font-medium">👤 {currentOperator.firstName} {currentOperator.lastName}</span>
                <button onClick={() => setCurrentOperator(null)} className="text-green-600 hover:text-green-800 text-xs">Wyloguj</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">?</div>
              </div>
            )}
          </div>
        </div>

        {/* Hero */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard produkcji</h1>
            <p className="text-sm text-gray-500 mt-1">Monitorowanie maszyn lotniskowych w czasie rzeczywistym.</p>
          </div>
        </div>

        {/* Logowanie RFID */}
        {!currentOperator && <RfidLogin onLogin={setCurrentOperator} />}

        {/* Machine Dashboard */}
        <MachineDashboard />
      </main>
    </div>
  );
}

export default App;