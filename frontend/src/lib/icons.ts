import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Cpu,
  Database,
  Factory,
  Gauge,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  ListOrdered,
  Luggage,
  Mail,
  MapPin,
  MonitorCog,
  Package,
  PackageCheck,
  Plane,
  PlaneTakeoff,
  Plug,
  Settings,
  ShieldCheck,
  Siren,
  Trash2,
  Truck,
  Users,
  Warehouse,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Baza przechowuje NAZWĘ ikony (module_configs.icon), nie komponent — dzięki
// temu zmiana ikony modułu przez panel admina nie wymaga deployu. Rejestr jest
// jawny, a nie `import * as lucide`, żeby do bundla nie wjechała cała biblioteka.
//
// Nowa ikona dla pakietu branżowego = jedna linijka tutaj.
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Cpu,
  Database,
  Factory,
  Gauge,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  ListOrdered,
  Luggage,
  Mail,
  MapPin,
  MonitorCog,
  Package,
  PackageCheck,
  Plane,
  PlaneTakeoff,
  Plug,
  Settings,
  ShieldCheck,
  Siren,
  Trash2,
  Truck,
  Users,
  Warehouse,
  Wrench,
  Zap,
};

export const ICON_NAMES = Object.keys(ICON_REGISTRY);

// Nieznana nazwa nie może wywalić menu — konfiguracja przychodzi z bazy i może
// wskazywać ikonę z nowszej wersji rejestru.
export function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_REGISTRY[name]) || Boxes;
}
