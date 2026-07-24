-- Tabela zleceń produkcyjnych
CREATE TABLE IF NOT EXISTS production_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    planned_start TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela operatorów
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(200) UNIQUE,
    pin_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela logów produkcyjnych
CREATE TABLE IF NOT EXISTS production_logs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES production_orders(id),
    operator_id INTEGER REFERENCES operators(id),
    action VARCHAR(20) NOT NULL
        CHECK (action IN ('start', 'stop')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Indeksy
CREATE INDEX idx_orders_status ON production_orders(status);
CREATE INDEX idx_logs_order ON production_logs(order_id);
CREATE INDEX idx_logs_timestamp ON production_logs(timestamp);

-- Przykładowe dane
INSERT INTO production_orders (order_number, product_name, quantity, status, planned_start)
VALUES 
    ('Z-2026-001', 'Obudowa plastikowa typ A', 500, 'pending', '2026-07-24 06:00:00'),
    ('Z-2026-002', 'Wkręt M8x30', 10000, 'in_progress', '2026-07-23 22:00:00'),
    ('Z-2026-003', 'Uszczelka gumowa 50mm', 2000, 'completed', '2026-07-22 06:00:00');

INSERT INTO operators (first_name, last_name, email, pin_code)
VALUES 
    ('Jan', 'Kowalski', 'jan.kowalski@fabryka.pl', '1234'),
    ('Anna', 'Nowak', 'anna.nowak@fabryka.pl', '5678');
    