import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Skeleton,
  Slider,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { RotateCcw, Save, Send, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { usd, pct, num, signedUsd } from '../lib/format';

type Drivers = {
  install_base_growth_pct: number;
  spares_price_uplift_pct: number;
  contract_renewal_rate_pct: number;
  labor_rate_uplift_pct: number;
  new_tool_installs_6mo: number;
};

const DRIVER_META: { key: keyof Drivers; label: string; min: number; max: number; step: number; suffix: string }[] = [
  { key: 'install_base_growth_pct', label: 'Installed Base Growth', min: 0, max: 12, step: 0.5, suffix: '%' },
  { key: 'spares_price_uplift_pct', label: 'Spares Price Uplift', min: 0, max: 10, step: 0.5, suffix: '%' },
  { key: 'contract_renewal_rate_pct', label: 'Contract Renewal Rate', min: 70, max: 100, step: 0.5, suffix: '%' },
  { key: 'labor_rate_uplift_pct', label: 'Labor Rate Uplift', min: 0, max: 8, step: 0.5, suffix: '%' },
  { key: 'new_tool_installs_6mo', label: 'New Tool Installs (6 mo)', min: 0, max: 24, step: 1, suffix: '' },
];

function KpiCard({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card className="p-4 flex flex-col gap-1 justify-between">
      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl font-bold text-foreground leading-tight">{children}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

const revenueChartConfig = {
  actual: { label: 'Actual', color: 'var(--color-chart-3)' },
  forecast: { label: 'Forecast', color: 'var(--color-muted-foreground)' },
};
const mixChartConfig = {
  spares_revenue: { label: 'Spares', color: 'var(--color-chart-3)' },
  labor_revenue: { label: 'Labor', color: 'var(--color-chart-2)' },
};
const perToolChartConfig = {
  revenue_per_tool: { label: 'Revenue / Tool', color: 'var(--color-success)' },
};

export function DashboardPage() {
  const { data: accounts } = useAnalyticsQuery('accounts_list', useMemo(() => ({}), []));
  const { data: versions } = useAnalyticsQuery('versions', useMemo(() => ({}), []));

  const [region, setRegion] = useState<string>('All Regions');
  const [accountId, setAccountId] = useState<number>(1);
  const [versionId, setVersionId] = useState<string>('v1');
  const [month, setMonth] = useState<string>('Sep 26');

  const regions = useMemo(
    () => ['All Regions', ...Array.from(new Set((accounts ?? []).map((a) => a.region))).sort()],
    [accounts],
  );
  const accountOptions = useMemo(
    () => (accounts ?? []).filter((a) => region === 'All Regions' || a.region === region),
    [accounts, region],
  );

  // keep a valid account selected when region filter changes
  // (account_id arrives as a string over JSON — compare numerically)
  useEffect(() => {
    if (accountOptions.length && !accountOptions.some((a) => Number(a.account_id) === accountId)) {
      setAccountId(Number(accountOptions[0].account_id));
    }
  }, [accountOptions, accountId]);

  const accountParams = useMemo(() => ({ accountId: sql.int(accountId) }), [accountId]);
  const { data: kpiRows, loading: kpiLoading } = useAnalyticsQuery('account_kpis', accountParams);
  const { data: monthly, loading: monthlyLoading } = useAnalyticsQuery('monthly_revenue', accountParams);
  const { data: forecast } = useAnalyticsQuery('forecast_series', accountParams);
  const { data: driverRows } = useAnalyticsQuery('drivers', accountParams);
  const { data: submission } = useAnalyticsQuery('latest_submission', accountParams);

  const kpi = kpiRows?.[0];
  const baseDrivers = driverRows?.[0];

  // driver sliders (initialized from the baseline once loaded per account)
  const [drivers, setDrivers] = useState<Drivers | null>(null);
  const baseDriversNum: Drivers | undefined = baseDrivers && {
    install_base_growth_pct: Number(baseDrivers.install_base_growth_pct),
    spares_price_uplift_pct: Number(baseDrivers.spares_price_uplift_pct),
    contract_renewal_rate_pct: Number(baseDrivers.contract_renewal_rate_pct),
    labor_rate_uplift_pct: Number(baseDrivers.labor_rate_uplift_pct),
    new_tool_installs_6mo: Number(baseDrivers.new_tool_installs_6mo),
  };
  useEffect(() => {
    if (baseDriversNum) setDrivers({ ...baseDriversNum });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDrivers]);

  // month options from the forecast horizon
  const monthOptions = useMemo(() => (forecast ?? []).map((f) => f.month_label), [forecast]);
  useEffect(() => {
    if (monthOptions.length && !monthOptions.includes(month)) setMonth(monthOptions[0]);
  }, [monthOptions, month]);

  // ---- driver-adjusted next-6-month forecast ----
  const baseNext6 = kpi ? Number(kpi.next6_total) : 0;
  const perToolMonthly = kpi && Number(kpi.installed_base) ? Number(kpi.l12m_revenue) / Number(kpi.installed_base) / 12 : 0;
  const adjustedNext6 = useMemo(() => {
    if (!kpi) return 0;
    if (!drivers || !baseDriversNum) return baseNext6;
    const factor =
      1 +
      ((drivers.install_base_growth_pct - baseDriversNum.install_base_growth_pct) / 100) * 0.4 +
      ((drivers.spares_price_uplift_pct - baseDriversNum.spares_price_uplift_pct) / 100) * 0.52 +
      ((drivers.labor_rate_uplift_pct - baseDriversNum.labor_rate_uplift_pct) / 100) * 0.33 +
      ((drivers.contract_renewal_rate_pct - baseDriversNum.contract_renewal_rate_pct) / 100) * 0.15;
    const installDelta =
      (drivers.new_tool_installs_6mo - baseDriversNum.new_tool_installs_6mo) * perToolMonthly * 6 * 0.5;
    return Math.max(0, baseNext6 * factor + installDelta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpi, drivers, baseNext6, perToolMonthly]);

  const driverDelta = kpi ? adjustedNext6 - baseNext6 : 0;

  // numeric-coerced monthly rows for the bar / area charts
  const monthlyNum = useMemo(
    () =>
      (monthly ?? []).map((m) => ({
        month_label: m.month_label,
        spares_revenue: Number(m.spares_revenue),
        labor_revenue: Number(m.labor_revenue),
        revenue_per_tool: Number(m.revenue_per_tool),
        total_revenue: Number(m.total_revenue),
      })),
    [monthly],
  );

  // ---- combined actual + forecast series for the 24-month trend ----
  const revenueSeries = useMemo(() => {
    const actuals = (monthly ?? []).map((m) => ({
      label: m.month_label,
      actual: Number(m.total_revenue),
      forecast: null as number | null,
    }));
    if (actuals.length && (forecast?.length ?? 0)) {
      // stitch the forecast onto the last actual point for a continuous line
      actuals[actuals.length - 1] = { ...actuals[actuals.length - 1], forecast: actuals[actuals.length - 1].actual };
    }
    const fc = (forecast ?? []).map((f) => ({
      label: f.month_label,
      actual: null as number | null,
      forecast: Number(f.total_revenue_forecast),
    }));
    return [...actuals, ...fc];
  }, [monthly, forecast]);

  // ---- submit / save draft ----
  const [saving, setSaving] = useState<'idle' | 'draft' | 'submit'>('idle');
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function persist(status: 'Draft' | 'Submitted') {
    if (!kpi || !drivers) return;
    setSaving(status === 'Draft' ? 'draft' : 'submit');
    try {
      const resp = await fetch('/api/submit-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: kpi.account_id,
          account_name: kpi.account_name,
          region: kpi.region,
          version_id: versionId,
          forecast_month: month,
          next6_forecast: Math.round(adjustedNext6),
          confidence: kpi.forecast_confidence,
          status,
          drivers_json: JSON.stringify(drivers),
          notes: status === 'Submitted' ? 'Submitted from Service Forecast Cockpit.' : 'Draft saved.',
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setSubmitStatus(status);
      setToast(status === 'Submitted' ? 'Forecast submitted ✓' : 'Draft saved ✓');
    } catch {
      setToast('Save failed — check connection');
    } finally {
      setSaving('idle');
      setTimeout(() => setToast(null), 3500);
    }
  }

  function resetDrivers() {
    if (baseDrivers) setDrivers({ ...baseDrivers });
    setSubmitStatus(null);
  }

  const effectiveStatus = submitStatus ?? submission?.[0]?.status ?? 'Working';
  const confidence = kpi?.forecast_confidence ?? '—';

  return (
    <div className="space-y-4">
      {/* ---------- Filter / action bar ---------- */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Account" className="min-w-[220px] flex-1">
            <Select value={String(accountId)} onValueChange={(v) => setAccountId(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accountOptions.map((a) => (
                  <SelectItem key={a.account_id} value={String(a.account_id)}>{a.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Region" className="w-[160px]">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Forecast Version" className="w-[170px]">
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(versions ?? []).map((v) => (
                  <SelectItem key={v.version_id} value={v.version_id}>{v.version_label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Month" className="w-[120px]">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={resetDrivers}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
            </Button>
            <Button variant="outline" size="sm" disabled={saving !== 'idle'} onClick={() => persist('Draft')}>
              <Save className="h-4 w-4 mr-1.5" /> {saving === 'draft' ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" disabled={saving !== 'idle'} onClick={() => persist('Submitted')}>
              <Send className="h-4 w-4 mr-1.5" /> {saving === 'submit' ? 'Submitting…' : 'Submit Forecast'}
            </Button>
          </div>
        </div>
        {toast && <div className="mt-2 text-sm text-success font-medium">{toast}</div>}
      </Card>

      {/* ---------- KPI row 1 ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiLoading || !kpi ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <KpiCard label="Account" sub={`${kpi.region} · ${kpi.segment}`}>
              <span className="text-xl">{kpi.account_name}</span>
            </KpiCard>
            <KpiCard label="Installed Base" sub={`+${kpi.new_installs_6mo} new in 6 mo`}>
              {num(kpi.installed_base)}
            </KpiCard>
            <KpiCard
              label="L12M Revenue"
              sub={<span className={kpi.yoy_pct >= 0 ? 'text-success' : 'text-destructive'}>YoY {pct(kpi.yoy_pct)}</span>}
            >
              {usd(kpi.l12m_revenue)}
            </KpiCard>
            <KpiCard label="YTD Actual" sub="Year to date">
              {usd(kpi.ytd_actual)}
            </KpiCard>
            <KpiCard
              label="Current Month FC"
              sub={
                <span className={kpi.variance_vs_prior >= 0 ? 'text-success inline-flex items-center' : 'text-destructive inline-flex items-center'}>
                  {kpi.variance_vs_prior >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {signedUsd(kpi.variance_vs_prior)} ({pct(kpi.variance_pct)})
                </span>
              }
            >
              {usd(kpi.current_month_fc)}
            </KpiCard>
          </>
        )}
      </div>

      {/* ---------- KPI row 2 ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiLoading || !kpi ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <KpiCard label="Confidence">
              <Badge
                className={
                  confidence === 'High'
                    ? 'bg-success/15 text-success border-success/30'
                    : confidence === 'Medium'
                      ? 'bg-warning/15 text-warning border-warning/30'
                      : 'bg-destructive/15 text-destructive border-destructive/30'
                }
              >
                ● {confidence}
              </Badge>
            </KpiCard>
            <KpiCard label="Status">
              <Badge variant="secondary" className="text-sm">{effectiveStatus}</Badge>
            </KpiCard>
            <KpiCard label="Next 6 Mo. Total" sub={<span>Driver-adjusted {driverDelta !== 0 ? `(${signedUsd(driverDelta)})` : ''}</span>}>
              {usd(adjustedNext6)}
            </KpiCard>
            <KpiCard
              label="Variance vs Prior Mo."
              sub={<span className={kpi.variance_pct >= 0 ? 'text-success' : 'text-destructive'}>{pct(kpi.variance_pct)}</span>}
            >
              {signedUsd(kpi.variance_vs_prior)}
            </KpiCard>
          </>
        )}
      </div>

      {/* ---------- Historical Trends ---------- */}
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Historical Trends
        </h2>
        <p className="text-sm text-muted-foreground mb-3">Review actuals before adjusting drivers below.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly total revenue — actual + forecast */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Monthly Total Revenue — 24 months + forecast</div>
            {monthlyLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ChartContainer config={revenueChartConfig} className="h-[240px] w-full">
                <ComposedChart data={revenueSeries} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tickFormatter={(v) => usd(v)} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} connectNulls />
                  <Line dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                </ComposedChart>
              </ChartContainer>
            )}
          </Card>

          {/* Spares vs labor */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Spares vs Labor</div>
            {monthlyLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ChartContainer config={mixChartConfig} className="h-[240px] w-full">
                <BarChart data={monthlyNum} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month_label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tickFormatter={(v) => usd(v)} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="spares_revenue" stackId="a" fill="var(--color-spares_revenue)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="labor_revenue" stackId="a" fill="var(--color-labor_revenue)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </Card>
        </div>

        {/* Revenue per installed tool — full width */}
        <Card className="p-4 mt-4">
          <div className="text-sm font-medium mb-2">Revenue per Installed Tool</div>
          {monthlyLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ChartContainer config={perToolChartConfig} className="h-[200px] w-full">
              <AreaChart data={monthlyNum} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-revenue_per_tool)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-revenue_per_tool)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month_label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={2} />
                <YAxis tickFormatter={(v) => usd(v)} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="revenue_per_tool" stroke="var(--color-revenue_per_tool)" strokeWidth={2} fill="url(#rpt)" />
              </AreaChart>
            </ChartContainer>
          )}
        </Card>
      </div>

      {/* ---------- Forecast drivers ---------- */}
      <Card className="p-4">
        <div className="text-base font-semibold text-foreground">Forecast Drivers</div>
        <p className="text-sm text-muted-foreground mb-4">
          Adjust the levers below — the driver-adjusted <span className="font-medium">Next 6 Mo. Total</span> updates live, then Save Draft or Submit.
        </p>
        {!drivers ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {DRIVER_META.map((d) => (
              <div key={d.key}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-semibold text-foreground">
                    {drivers[d.key]}
                    {d.suffix}
                  </span>
                </div>
                <Slider
                  value={[drivers[d.key]]}
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  onValueChange={([v]) => setDrivers((prev) => (prev ? { ...prev, [d.key]: v } : prev))}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">{label}</div>
      {children}
    </div>
  );
}
