import { createBrowserRouter, RouterProvider, NavLink, Outlet, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, Button, useIsMobile, Card } from '@databricks/appkit-ui/react';
import {
  Activity, LayoutDashboard, Building2, ClipboardList,
  Package, Boxes, ClipboardCheck, Settings as SettingsIcon, Menu,
} from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { SparesForecastPage } from './pages/SparesForecastPage';
import { ForecastReviewPage } from './pages/ForecastReviewPage';
import { AccountsPage } from './pages/AccountsPage';

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: 'Service Forecast',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/accounts', label: 'Accounts', icon: Building2 },
      { to: '/review', label: 'Forecast Review', icon: ClipboardList },
    ],
  },
  {
    title: 'Spares Forecast',
    items: [
      { to: '/spares', label: 'Dashboard', icon: Package },
      { to: '/spares-accounts', label: 'Accounts', icon: Boxes },
      { to: '/spares-review', label: 'Forecast Review', icon: ClipboardCheck },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Activity className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-[15px]">Service Cockpit</div>
          <div className="text-xs text-muted-foreground">Forecast Planning</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </div>
            {section.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `mx-2 px-3 py-2 rounded-md flex items-center gap-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  }`
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">System</div>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mx-2 px-3 py-2 rounded-md flex items-center gap-2.5 text-sm transition-colors ${
              isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            }`
          }
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </NavLink>
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-muted-foreground">
        ASM International · Aftermarket
      </div>
    </div>
  );
}

const PAGE_TITLE: Record<string, string> = {
  '/': 'Transactional Service Forecast Cockpit',
  '/spares': 'Transactional Spares Forecast Cockpit',
  '/accounts': 'Service Accounts',
  '/spares-accounts': 'Service Accounts',
  '/review': 'Forecast Review',
  '/spares-review': 'Forecast Review',
  '/settings': 'Settings',
};

function Layout() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { if (!isMobile) setOpen(false); }, [isMobile]);

  const title = PAGE_TITLE[location.pathname] ?? 'Transactional Service Forecast Cockpit';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-[236px] shrink-0 border-r border-sidebar-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[236px]">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Demo Mode</span>
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">AM</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-base font-semibold text-foreground">Settings</h2>
      <Card className="p-5 space-y-3 text-sm">
        <Row k="Application" v="ASM Transactional Service Forecast Cockpit" />
        <Row k="Platform" v="Databricks Apps · AppKit (React + Node)" />
        <Row k="Data" v="Unity Catalog — dante_classic_stable_catalog.asm_service_forecast" />
        <Row k="Forecast engine" v="ai_forecast (baseline) + driver adjustments" />
        <Row k="AI" v="Genie (NL→SQL) · Vector Search RAG · Model Serving (Claude)" />
        <Row k="Write-back" v="forecast_submissions (transactional Save Draft / Submit)" />
      </Card>
      <p className="text-xs text-muted-foreground">
        This cockpit demonstrates a Lovable-style forecasting app running natively on Databricks — governed data, an
        AI/BI-grade forecast, Genie + Vector Search assistants, and transactional write-back in one custom app.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground text-right">{v}</span>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/spares', element: <SparesForecastPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/spares-accounts', element: <AccountsPage /> },
      { path: '/review', element: <ForecastReviewPage /> },
      { path: '/spares-review', element: <ForecastReviewPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
