import { useState, useEffect } from 'react';

interface SensorReading {
  id: number;
  sensorName: string;
  value: number;
  unit: string;
  location: string;
  timestamp: string;
}

export function TemperatureWidget() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [status, setStatus] = useState<'ok' | 'warning' | 'critical'>('ok');

  const fetchReadings = () => {
    fetch('http://localhost:3001/sensors')
      .then(res => res.json())
      .then((data: SensorReading[]) => {
        setReadings(data);
        if (data.length > 0) {
          const latest = data[0].value;
          setCurrentTemp(latest);
          
          if (latest > 90) setStatus('critical');
          else if (latest > 80) setStatus('warning');
          else setStatus('ok');
        }
      })
      .catch(err => console.error('Błąd pobierania temperatury:', err));
  };

  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 5000); // odświeżaj co 5 sekund
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'ok': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ok': return 'W normie';
      case 'warning': return 'Podwyższona';
      case 'critical': return 'Krytyczna!';
    }
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">🌡️ Temperatura - Linia 1</h2>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {currentTemp !== null ? (
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-gray-900">{currentTemp}</span>
          <span className="text-2xl text-gray-500">°C</span>
        </div>
      ) : (
        <div className="text-gray-400">Ładowanie...</div>
      )}

      {/* Wykres słupkowy ostatnich odczytów */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Ostatnie odczyty</h3>
        <div className="flex items-end gap-1 h-24">
          {readings.slice(0, 20).reverse().map((reading, i) => {
            const height = Math.min((reading.value / 100) * 100, 100);
            const color = reading.value > 90 ? 'bg-red-400' : reading.value > 80 ? 'bg-yellow-400' : 'bg-green-400';
            return (
              <div
                key={reading.id}
                className={`flex-1 ${color} rounded-t transition-all duration-500`}
                style={{ height: `${height}%` }}
                title={`${reading.value}°C o ${new Date(reading.timestamp).toLocaleTimeString()}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>20 odczytów temu</span>
          <span>Teraz</span>
        </div>
      </div>
    </div>
  );
}