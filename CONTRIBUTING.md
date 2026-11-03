# Praca z repozytorium OptimaticMES

## Gałęzie

- `main` – gałąź stabilna. Nie pushujemy do niej bezpośrednio, zmiany trafiają przez Pull Request.
- Gałęzie robocze tworzymy od `main` z prefiksem opisującym typ zmiany:
  - `feat/<krótki-opis>` – nowa funkcja (np. `feat/panel-operatora-rfid`)
  - `fix/<krótki-opis>` – poprawka błędu (np. `fix/operator-panel-przestoje`)
  - `chore/<krótki-opis>` – konfiguracja, zależności, CI
  - `docs/<krótki-opis>` – dokumentacja

## Commity

Stosujemy [Conventional Commits](https://www.conventionalcommits.org/pl/):

```
feat: dodanie widgetu temperatury
fix(operators): poprawne zamykanie sesji RFID
chore(ci): cache npm w GitHub Actions
```

## Pull Requesty i CI

Każdy PR do `main` uruchamia workflow **CI** (`.github/workflows/ci.yml`):

| Job        | Co sprawdza                                                        |
| ---------- | ------------------------------------------------------------------ |
| Backend    | `npm ci`, `npm run build`, testy jednostkowe (Jest), ESLint        |
| Frontend   | `npm ci`, `tsc --noEmit`, `npm run build`, ESLint                  |
| Database   | wgrywa `database/*.sql` na czystą bazę TimescaleDB                 |

Lint jest na razie informacyjny (nie blokuje PR), bo istniejący kod nie jest jeszcze
sformatowany. Po uruchomieniu `npm run lint` / `npm run format` w obu katalogach
można usunąć `continue-on-error` z workflow.

## Lokalnie przed pushem

```bash
cd backend  && npm run build && npm test && npm run lint:check
cd frontend && npm run typecheck && npm run build && npm run lint:check
```

## Zalecana ochrona gałęzi `main` (GitHub → Settings → Branches)

- Require a pull request before merging
- Require status checks to pass: `Backend (NestJS)`, `Frontend (TanStack Start)`, `Database schema (TimescaleDB)`
