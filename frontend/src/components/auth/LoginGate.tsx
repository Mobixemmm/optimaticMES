import { useState } from "react";
import { Factory } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/branding";

// Pełnoekranowa blokada dla `_dashboard`: dopóki nie ma sesji, nikt nie widzi
// nawet pustych widżetów dashboardu — tylko ten formularz logowania.
export function LoginGate() {
  const { user, login } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Konto demo "Guest" loguje się poprawnie (prawdziwe id z bazy), ale rola
  // "guest" jest z rozmysłu traktowana jak brak sesji (patrz _dashboard.tsx)
  // — bez tego komunikatu ten ekran po prostu nie zniknąłby, bez wyjaśnienia.
  const blockedAsGuest = user.id !== 0 && user.role === "guest";

  const attemptLogin = async (email: string, password: string) => {
    setErrorMsg("");
    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.message || "Błąd logowania");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptLogin(emailInput, passInput);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{APP_NAME}</h1>
            <p className="text-xs text-muted-foreground">
              Zaloguj się, aby uzyskać dostęp do systemu
            </p>
          </div>
        </div>

        {(errorMsg || blockedAsGuest) && (
          <div className="p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold text-center">
            {blockedAsGuest
              ? "Konto Gościa ma ograniczony dostęp i nie pokazuje danych produkcyjnych. Zaloguj się na konto z wyższymi uprawnieniami."
              : errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
              Adres e-mail
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="imie.nazwisko@firma.pl"
              autoComplete="username"
              autoFocus
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
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:opacity-90 transition disabled:opacity-60"
          >
            {isSubmitting ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>

        {/* Był tu panel „szybkiego logowania demo" z czterema kontami i ich
            hasłami wypisanymi wprost na ekranie. Dla klienta to podwójny sygnał
            ostrzegawczy: system wygląda na wersję pokazową, a hasła są
            traktowane jak element interfejsu. Konta demonstracyjne zakłada się
            skryptem seed, a loguje przez ten sam formularz co wszyscy. */}
      </div>
    </div>
  );
}
