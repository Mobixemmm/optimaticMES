// Nazwa produktu w jednym miejscu. Wcześniej stała w czterech plikach w dwóch
// wariantach naraz („ProdFlow" w interfejsie, „OptimaticMES" w repozytorium
// i adresach kont) — dla klienta wygląda to jak niedokończona zmiana nazwy,
// a przy zmianie brandingu wymaga polowania po kodzie.
//
// Nazwa KLIENTA to co innego i przychodzi z bazy (tenant.name w /bootstrap) —
// tego nie zaszywamy nigdy.
export const APP_NAME = "OptimaticMES";

/** Tytuł strony i nagłówki OpenGraph. */
export const APP_TITLE = `${APP_NAME} — system realizacji produkcji`;

// Opis w meta stał wcześniej w trzech miejscach, w każdym z tą samą literówką
// („zarząddzania"). Jedna stała zamiast trzech kopii to także jedno miejsce,
// w którym taki błąd trzeba poprawić.
export const APP_DESCRIPTION =
  "System MES do rejestracji produkcji, monitorowania OEE, obsługi zleceń i nadzoru nad parkiem maszynowym w czasie rzeczywistym.";
