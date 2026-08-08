// Rejestr systemów zewnętrznych. Kod wie, z JAKIMI systemami umie rozmawiać;
// baza (integration_connections) trzyma, KTÓRY z nich klient faktycznie wybrał
// i z jakimi parametrami. Dokładnie ta sama zasada co w modules.constants.ts.
//
// Świadomie NIE nazywa się to "ERP": wchodzimy w trzy branże, a lotnisko nie ma
// ERP tylko AODB i system BHS. Rodzaj systemu jest polem, nie założeniem.

export type ConnectorKind = 'erp' | 'wms' | 'aodb' | 'file';

// Co konektor potrafi. Sterownik implementuje tylko te operacje, które
// deklaruje — panel admina pokazuje resztę jako niedostępną, zamiast dać
// przycisk, który rzuci błędem.
export type ConnectorCapability =
  | 'pull_orders'
  | 'push_progress'
  | 'pull_materials';

// `planned` znaczy: umiemy to opisać, ale sterownika jeszcze NIE ma. Wpis jest
// w rejestrze, żeby panel admina pokazywał realną mapę drogową, a nie żeby
// udawać działającą integrację — próba użycia kończy się jasnym komunikatem.
export type ConnectorStatus = 'available' | 'planned';

export interface ConnectorField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  // Pola oznaczone jako sekret idą do zaszyfrowanego worka i NIGDY nie wracają
  // do przeglądarki (patrz IntegrationsService.mask).
  secret: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface ConnectorDefinition {
  key: string;
  name: string;
  vendor: string;
  kind: ConnectorKind;
  status: ConnectorStatus;
  // Kody pakietów branżowych, w których ten system ma sens. Pusta tablica =
  // uniwersalny, pokazywany zawsze.
  industries: string[];
  description: string;
  capabilities: ConnectorCapability[];
  driver: string;
  fields: ConnectorField[];
}

const REST_FIELDS: ConnectorField[] = [
  {
    key: 'baseUrl',
    label: 'Adres bazowy API',
    type: 'url',
    required: true,
    secret: false,
    placeholder: 'https://erp.firma.pl/api/v1',
  },
  {
    key: 'ordersPath',
    label: 'Ścieżka listy zleceń',
    type: 'text',
    required: false,
    secret: false,
    placeholder: '/production-orders',
    help: 'Dopisywana do adresu bazowego przy pobieraniu zleceń.',
  },
  {
    key: 'progressPath',
    label: 'Ścieżka raportowania postępu',
    type: 'text',
    required: false,
    secret: false,
    placeholder: '/production-orders/{orderNumber}/progress',
    help: 'Znacznik {orderNumber} zostanie podmieniony numerem zlecenia.',
  },
  {
    key: 'authType',
    label: 'Uwierzytelnianie',
    type: 'select',
    required: true,
    secret: false,
    options: [
      { value: 'none', label: 'Brak' },
      { value: 'bearer', label: 'Token Bearer' },
      { value: 'basic', label: 'Basic (login i hasło)' },
      { value: 'header', label: 'Własny nagłówek' },
    ],
  },
  {
    key: 'authHeaderName',
    label: 'Nazwa nagłówka',
    type: 'text',
    required: false,
    secret: false,
    placeholder: 'X-API-Key',
    help: 'Tylko dla uwierzytelniania „Własny nagłówek".',
  },
  {
    key: 'username',
    label: 'Login',
    type: 'text',
    required: false,
    secret: false,
    help: 'Tylko dla uwierzytelniania Basic.',
  },
  {
    key: 'token',
    label: 'Token / hasło / klucz API',
    type: 'password',
    required: false,
    secret: true,
  },
];

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    key: 'rest-generic',
    name: 'Uniwersalny REST / JSON',
    vendor: 'dowolny',
    kind: 'erp',
    status: 'available',
    industries: [],
    description:
      'Podłącza dowolny system wystawiający REST z JSON-em. Mapowanie pól ustawia się bez zmiany kodu — to jest droga na skróty do każdego ERP, który ma jakiekolwiek API.',
    capabilities: ['pull_orders', 'push_progress'],
    driver: 'rest',
    fields: [
      ...REST_FIELDS,
      {
        key: 'fieldMap',
        label: 'Mapowanie pól (JSON)',
        type: 'text',
        required: false,
        secret: false,
        placeholder: '{"orderNumber":"nr_zlecenia","productName":"wyrob","quantity":"ilosc"}',
        help: 'Klucz = pole w MES, wartość = pole w systemie zewnętrznym. Puste = nazwy zgodne.',
      },
      {
        key: 'rootPath',
        label: 'Ścieżka do tablicy w odpowiedzi',
        type: 'text',
        required: false,
        secret: false,
        placeholder: 'data.items',
        help: 'Gdy lista nie jest na najwyższym poziomie odpowiedzi.',
      },
    ],
  },

  // --- Fabryki -------------------------------------------------------
  {
    key: 'sap-s4hana',
    name: 'SAP S/4HANA',
    vendor: 'SAP',
    kind: 'erp',
    status: 'planned',
    industries: ['factory'],
    description: 'Integracja przez OData. Wymaga bramki SAP Gateway i konta technicznego.',
    capabilities: ['pull_orders', 'push_progress', 'pull_materials'],
    driver: 'sap',
    fields: REST_FIELDS,
  },
  {
    key: 'comarch-erp-xl',
    name: 'Comarch ERP XL',
    vendor: 'Comarch',
    kind: 'erp',
    status: 'planned',
    industries: ['factory', 'warehouse'],
    description: 'Integracja przez API Comarch. Popularny wybór w polskich zakładach średniej wielkości.',
    capabilities: ['pull_orders', 'push_progress', 'pull_materials'],
    driver: 'comarch',
    fields: REST_FIELDS,
  },
  {
    key: 'enova365',
    name: 'enova365',
    vendor: 'Soneta',
    kind: 'erp',
    status: 'planned',
    industries: ['factory', 'warehouse'],
    description: 'Integracja przez REST API enova365.',
    capabilities: ['pull_orders', 'push_progress'],
    driver: 'enova',
    fields: REST_FIELDS,
  },

  // --- Magazyny ------------------------------------------------------
  {
    key: 'wms-rest',
    name: 'WMS przez REST',
    vendor: 'dowolny',
    kind: 'wms',
    status: 'planned',
    industries: ['warehouse'],
    description: 'Awizacje i stany magazynowe z systemu WMS.',
    capabilities: ['pull_orders', 'pull_materials'],
    driver: 'wms',
    fields: REST_FIELDS,
  },

  // --- Lotniska ------------------------------------------------------
  {
    key: 'aodb-rest',
    name: 'AODB (baza operacyjna lotniska)',
    vendor: 'dowolny',
    kind: 'aodb',
    status: 'planned',
    industries: ['airport'],
    description:
      'Rozkład lotów jako źródło „zleceń". Lotnisko nie ma ERP — odpowiednikiem zlecenia jest lot.',
    capabilities: ['pull_orders'],
    driver: 'aodb',
    fields: REST_FIELDS,
  },
  {
    key: 'bhs-events',
    name: 'System BHS (sortownia bagażu)',
    vendor: 'dowolny',
    kind: 'aodb',
    status: 'planned',
    industries: ['airport'],
    description: 'Zdarzenia z sortowni bagażu: skany, przekierowania, zrzuty na stanowiska.',
    capabilities: ['pull_orders'],
    driver: 'bhs',
    fields: REST_FIELDS,
  },
];

export function findConnector(key: string): ConnectorDefinition | undefined {
  return CONNECTOR_DEFINITIONS.find((c) => c.key === key);
}

// Konektory sensowne dla danej branży: uniwersalne (industries: []) plus te
// jawnie przypisane do pakietu klienta.
export function connectorsForIndustry(industryPack: string | null): ConnectorDefinition[] {
  return CONNECTOR_DEFINITIONS.filter(
    (c) => c.industries.length === 0 || (industryPack !== null && c.industries.includes(industryPack)),
  );
}
