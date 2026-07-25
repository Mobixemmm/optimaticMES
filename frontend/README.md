# OptimaticMES — frontend (Lovable / TanStack Start)

UI z projektu [optimaticmes-081ea8f1](https://github.com/Mobixemmm/optimaticmes-081ea8f1) (Lovable + TanStack Start).

## Wymagania

- Node.js 20+ (LTS)

## Uruchomienie

```powershell
cd frontend
npm install
npm run dev
```

Adres dev serwera pojawi się w terminalu (zwykle port **8080** lub **5173**).

## Backend NestJS

API działa na `http://localhost:3001`. W dev możesz wołać endpointy przez proxy Vite:

- żądanie: `fetch("/api/machine-data/machines")`
- trafia do: `http://localhost:3001/machine-data/machines`

Uruchom backend z katalogu `backend` (`npm run start:dev`) oraz bazę z `docker/docker-compose.yml`.

## Skrypty

| Polecenie | Opis |
|-----------|------|
| `npm run dev` | Serwer deweloperski |
| `npm run build` | Build produkcyjny |
| `npm run preview` | Podgląd buildu |
