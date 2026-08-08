import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { LoginGate } from "@/components/auth/LoginGate";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, isGuest, isLoadingMe } = useAuth();

  if (isLoadingMe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  // Konto o roli "guest" (nawet gdy naprawdę zalogowane, z prawdziwym id) ma
  // liczyć się tak samo jak brak sesji — nie odsłania dashboardu z danymi.
  if (isGuest || user.role === "guest") {
    return <LoginGate />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex max-w-[1600px] items-start gap-6">
        <Sidebar />
        <main className="flex-1 space-y-6 min-w-0">
          <TopBar />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
