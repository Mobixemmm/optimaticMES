import { useEffect, useState } from "react";
import { LogOut, Sun, Moon, Factory, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBootstrap } from "@/lib/bootstrap";
import { APP_NAME } from "@/lib/branding";

export function TopBar() {
  const { user, isGuest } = useAuth();
  const { bootstrap, t } = useBootstrap();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Nazewnictwo zakładu jest konfigurowalne (fabryka: „Zakład", lotnisko:
  // „Terminal"), więc etykieta idzie przez słownik, a nie przez stałą.
  const siteLabel =
    bootstrap.sites.length === 1
      ? bootstrap.sites[0].name
      : `${t("site", "Zakład")} · ${bootstrap.sites.length}`;
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark"
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-card p-3 shadow-card">
        {/* Nazwa klienta z bazy — górny pasek ma mówić, CZYJE dane są na
            ekranie. To jest informacja, a nie ozdoba; stały tu wcześniej trzy
            atrapy: wyszukiwarka bez obsługi wpisanego tekstu, ikona poczty bez
            skrzynki i dzwonek z na stałe zapaloną kropką nieprzeczytanych
            powiadomień. Klient sprawdza takie rzeczy w pierwszej minucie. */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground">
            {bootstrap.tenant?.name ?? APP_NAME}
          </div>
          <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {siteLabel}
          </div>
        </div>

        {/* Przełącznik Motywu Jasny / Ciemny */}
        <button
          onClick={() => setIsDark(!isDark)}
          title={isDark ? "Przełącz na tryb jasny" : "Przełącz na tryb ciemny"}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted transition hover:bg-accent hover:scale-105 active:scale-95"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-amber-400 transition-all" />
          ) : (
            <Moon className="h-5 w-5 text-slate-700 dark:text-slate-200 transition-all" />
          )}
        </button>

        {/* Interaktywna karta konta / Przycisk Zaloguj */}
        <button
          onClick={() => setIsAccountModalOpen(true)}
          className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2 border border-border/50 hover:bg-accent/80 transition cursor-pointer shadow-sm active:scale-98"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-sm">
            {user.avatarText}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-xs font-bold text-foreground">
              {isGuest ? "Zaloguj się" : user.name}
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold">
              {isGuest ? "Kliknij, aby zalogować" : user.roleLabel}
            </div>
          </div>
        </button>
      </div>

      {/* Popup Konta / Logowania */}
      <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />
    </>
  );
}

function AccountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, isGuest, login, logout } = useAuth();
  // Puste pola, nie wstępnie wpisane konto administratora — dane logowania
  // podaje użytkownik, a nie interfejs.
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showSwitchForm, setShowSwitchForm] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const res = await login(emailInput, passInput);
    if (res.success) {
      setShowSwitchForm(false);
      onClose();
    } else {
      setErrorMsg(res.message || "Błąd logowania");
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <Factory className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {!isGuest && !showSwitchForm ? "Konto użytkownika" : "Logowanie"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {!isGuest && !showSwitchForm
                  ? "Szczegóły sesji i uprawnienia"
                  : "Wprowadź dane dostępowe"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* WIDOK ZALOGOWANEGO UŻYTKOWNIKA */}
        {!isGuest && !showSwitchForm ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/60 border border-border/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-bold text-primary-foreground shadow-elegant">
                {user.avatarText}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-foreground truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{user.email}</div>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary border border-primary/30">
                    {user.roleLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-destructive/15 py-3 text-sm font-bold text-destructive hover:bg-destructive/25 transition"
              >
                <LogOut className="h-4 w-4" /> Wyloguj się
              </button>

              <button
                onClick={() => setShowSwitchForm(true)}
                className="w-full rounded-full bg-muted py-2.5 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                Przełącz na inne konto / Zaloguj ponownie
              </button>
            </div>
          </div>
        ) : (
          /* FORMULARZ LOGOWANIA (Gdy jest Gościem lub kliknął przełącz konto) */
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Adres E-mail
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="imie.nazwisko@firma.pl"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Hasło
                </label>
                <input
                  type="password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:opacity-90 transition"
              >
                Zaloguj się
              </button>
            </form>

            {!isGuest && (
              <button
                onClick={() => setShowSwitchForm(false)}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:underline pt-1"
              >
                ← Powrót do mojego konta
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
