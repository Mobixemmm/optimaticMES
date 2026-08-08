import { Link } from "@tanstack/react-router";
import { Construction, Check, ArrowRight } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { useBootstrap } from "@/lib/bootstrap";

interface PreviewSpec {
  /**
   * Nazwa modułu na wypadek wejścia z adresu, gdy moduł jest wyłączony —
   * bootstrap zwraca wtedy tylko moduły widoczne, więc etykieta z bazy nie
   * dojedzie, a surowy klucz w nagłówku wygląda jak błąd.
   */
  label: string;
  /** Po co ten moduł istnieje — jedno zdanie, bez marketingu. */
  purpose: string;
  /** Co system JUŻ ma, na czym ten moduł się oprze. */
  foundation: string[];
  /** Czego brakuje, żeby moduł zadziałał. */
  missing: string[];
}

// Opisy są konkretne celowo. Zakładka, która mówi tylko „wkrótce", jest gorsza
// niż jej brak: nie da się na jej podstawie ani wycenić pracy, ani zdecydować,
// czy moduł jest potrzebny. Tutaj widać, co jest gotowe i co trzeba dobudować.
const PREVIEWS: Record<string, PreviewSpec> = {
  historian: {
    label: "Parametry technologiczne",
    purpose:
      "Długoterminowy zapis i analiza parametrów technologicznych — temperatury, ciśnienia, prędkości — z progami alarmowymi i porównaniem przebiegów między partiami.",
    foundation: [
      "Telemetria płynie do TimescaleDB (tabele machine_data i sensor_data)",
      "Odczyty bieżące widać w module Maszyny i na kafelku panelu operatorskiego",
      "Zapytania są już zawężone do klienta przez kartotekę maszyn",
    ],
    missing: [
      "Definicje limitów i progów alarmowych per tag i per maszyna",
      "Agregaty ciągłe TimescaleDB pod wykresy z lat, nie z dni",
      "Porównanie przebiegu partii dobrej i partii z brakami",
    ],
  },
  instructions: {
    label: "Instrukcje stanowiskowe",
    purpose:
      "Instrukcje i filmy przypisane do stanowiska, dostępne dla operatora bez schodzenia z maszyny — z potwierdzeniem zapoznania się i wersjonowaniem.",
    foundation: [
      "Panel operatorski ma gotowe miejsce na kafelek instrukcji",
      "Kartoteka maszyn daje przypisanie treści do stanowiska",
    ],
    missing: [
      "Repozytorium plików (PDF, wideo) i polityka ich przechowywania",
      "Wersjonowanie instrukcji i rejestr potwierdzeń operatorów",
      "Powiązanie instrukcji z indeksem produktu, a nie tylko z maszyną",
    ],
  },
  safetyCrosses: {
    label: "Krzyże BHP i niezgodności",
    purpose:
      "Krzyże BHP, reklamacji i niezgodności — kalendarz miesięczny, w którym każdy dzień dostaje status, a z sumy powstaje wskaźnik dni bez zdarzenia.",
    foundation: [
      "Moduł Jakość rejestruje niezgodności produktowe (karty wad)",
      "Struktura organizacyjna Zakład → Obszar pozwala prowadzić krzyż per obszar",
    ],
    missing: [
      "Encja zdarzenia BHP z kategorią i ciężkością (pierwsza pomoc, wypadek, zdarzenie potencjalne)",
      "Widok kalendarza-krzyża z kolorowaniem dni i licznikiem serii",
      "Rejestr reklamacji klienta jako osobny strumień od niezgodności wewnętrznych",
    ],
  },
  inspections: {
    label: "Kontrola wewnątrzprocesowa",
    purpose:
      "Kontrola wewnątrzprocesowa: listy kontrolne wykonywane na stanowisku w zadanym takcie, z blokadą produkcji przy wyniku negatywnym.",
    foundation: [
      "Panel operatorski ma gotowe miejsce na kafelek inspekcji",
      "Moduł Jakość przyjmuje wynik negatywny jako kartę wady",
      "Sesje operatorów dają podpis pod wykonaną inspekcją",
    ],
    missing: [
      "Definicje list kontrolnych (pytania, typy odpowiedzi, tolerancje)",
      "Harmonogram wyzwalania inspekcji: co N sztuk, co N minut, na starcie zlecenia",
      "Reguła blokady stanowiska przy wyniku negatywnym",
    ],
  },
  notifications: {
    label: "Powiadomienia SMS / e-mail",
    purpose:
      "Powiadomienia SMS i e-mail o zdarzeniach, których nikt nie zdąży zobaczyć na tablicy — awaria w nocy, przekroczony próg braków, wezwanie Andon bez reakcji.",
    foundation: [
      "Andon i przestoje generują zdarzenia nadające się na wyzwalacz",
      "Konta użytkowników mają adresy e-mail",
    ],
    missing: [
      "Integracja z bramką SMS i serwerem SMTP wraz z konfiguracją per klient",
      "Reguły: kto, o czym i po jakim czasie bez reakcji ma dostać wiadomość",
      "Dziennik wysyłek i obsługa ponowień, żeby cisza nie była niezauważona",
    ],
  },
  events: {
    label: "Serwis eventów",
    purpose:
      "Serwis eventów: silnik reguł, w którym zdarzenie z produkcji uruchamia akcję — powiadomienie, zlecenie utrzymania ruchu, wpis do ERP.",
    foundation: [
      "Dziennik audytu zapisuje fakty operacji w systemie",
      "Moduł Integracje potrafi wywołać system zewnętrzny",
    ],
    missing: [
      "Szyna zdarzeń i trwała kolejka, żeby zdarzenie nie ginęło przy restarcie",
      "Edytor reguł: warunek → akcja, dostępny dla wdrożeniowca bez kodu",
      "Podgląd historii wyzwoleń i przyczyn nieudanych akcji",
    ],
  },
  bi: {
    label: "Business Intelligence",
    purpose:
      "Hurtownia danych z procesem ETL — raporty za lata, przekroje wielowymiarowe i podłączenie zewnętrznych narzędzi BI bez obciążania bazy produkcyjnej.",
    foundation: [
      "Analityka liczy OEE i przestoje na żywo z tabel operacyjnych",
      "Wszystkie zdarzenia mają znacznik czasu i przypisanie do klienta",
    ],
    missing: [
      "Model gwiazdy: wymiary czasu, maszyny, produktu, zmiany i tabele faktów",
      "Proces ETL z oknem inkrementalnym i kontrolą jakości ładowania",
      "Endpoint dla zewnętrznego BI, z uwierzytelnianiem innym niż sesja przeglądarki",
    ],
  },
  smartFactory: {
    label: "Smart Factory",
    purpose:
      "Warstwa predykcyjna nad danymi produkcyjnymi: przewidywanie awarii z przebiegu parametrów, wykrywanie anomalii i rekomendacje nastaw.",
    foundation: [
      "Historia telemetrii, przestojów i braków jest kompletna i spójna czasowo",
      "Genealogia wiąże partię materiału z wynikiem jakościowym",
    ],
    missing: [
      "Zbiór uczący i etykietowanie zdarzeń awaryjnych",
      "Środowisko uruchamiania modeli oraz polityka ich wersjonowania",
      "Sposób pokazania predykcji, który nie zamienia się w alarm ignorowany po tygodniu",
    ],
  },
  stepper: {
    label: "Stepper — sterowanie nadzorcze",
    purpose:
      "Sterowanie nadzorcze: prowadzenie operatora krok po kroku przez procedurę i przekazywanie nastaw do sterownika maszyny.",
    foundation: [
      "Uprawnienie machines.control oddziela podgląd od sterowania",
      "Telemetria daje sprzężenie zwrotne po wysłaniu nastawy",
    ],
    missing: [
      "Kanał zapisu do PLC — dziś gateway tylko czyta",
      "Definicje procedur: kroki, warunki przejścia, potwierdzenia",
      "Twarda blokada: żadna nastawa bez potwierdzenia uprawnionej osoby i wpisu w audycie",
    ],
  },
};

/**
 * Zakładka modułu, który jest w cenniku i w rejestrze, ale nie ma jeszcze
 * logiki domenowej. Mówi to wprost — pusta lista udawałaby brak danych,
 * a to dwie różne informacje.
 */
export function ModulePreviewView({ moduleKey }: { moduleKey: string }) {
  const { bootstrap, moduleLabel } = useBootstrap();
  const module = bootstrap.modules.find((m) => m.key === moduleKey);
  const spec = PREVIEWS[moduleKey];
  // Etykieta z bazy wygrywa (klient mógł ją zmienić), a gdy modułu nie ma
  // w bootstrapie — nazwa z rejestru poniżej, nigdy surowy klucz.
  const label = moduleLabel(moduleKey, spec?.label ?? moduleKey);

  return (
    <>
      <Header
        title={label}
        subtitle={spec?.purpose ?? "Moduł zarejestrowany w cenniku, bez logiki domenowej."}
      />

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-warning/15 px-5 py-4">
        <Construction className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-warning-foreground">
            Moduł nieskonfigurowany — zakładka istnieje, logiki jeszcze nie ma
          </div>
          <p className="mt-1 text-xs leading-relaxed text-warning-foreground/90">
            Ta zakładka nie pokazuje pustej listy udającej brak danych, bo to byłaby nieprawda:
            danych nie ma, bo modułu jeszcze nie zbudowano. Poniżej jest dokładnie to, co w systemie
            już stoi, i to, czego brakuje.
            {module &&
              !module.pricing.inPackage &&
              ` Pozycja cennikowa: +${module.pricing.pricePerStation} zł miesięcznie za stanowisko.`}
          </p>
        </div>
      </div>

      {spec && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-3xl bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground">Na czym się oprze</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Fundament, który już działa w systemie.
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {spec.foundation.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground">Czego brakuje</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Praca do wykonania, zanim moduł da się sprzedać jako działający.
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {spec.missing.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Moduł można wyłączyć w{" "}
        <Link to="/settings" className="font-semibold text-primary hover:underline">
          Ustawieniach
        </Link>
        , żeby zniknął z menu do czasu wdrożenia.
      </p>
    </>
  );
}
