import { useMemo, useState, useEffect } from 'react';
import {
  Card, Badge, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Skeleton, ChartContainer, ChartTooltip, ChartTooltipContent, useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RotateCcw, Save, Send, Package } from 'lucide-react';
import { usd, pct, num } from '../lib/format';

function KpiCard({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="p-4 flex flex-col gap-1 justify-between">
      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl font-bold text-foreground leading-tight">{children}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
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

const sparesTrendConfig = {
  spares_revenue: { label: 'Spares (actual)', color: 'var(--color-chart-3)' },
  spares_forecast: { label: 'Spares (forecast)', color: 'var(--color-muted-foreground)' },
};
const byLineConfig = { annual_spares: { label: 'Annual Spares', color: 'var(--color-chart-2)' } };

const SPARES_MIX = 0.52; // spares share of service revenue

export function SparesForecastPage() {
  const { data: accounts } = useAnalyticsQuery('accounts_list', useMemo(() => ({}), []));
  const { data: versions } = useAnalyticsQuery('versions', useMemo(() => ({}), []));

  const [region, setRegion] = useState('All Regions');
  const [accountId, setAccountId] = useState(1);
  const [versionId, setVersionId] = useState('v1');
  const [month, setMonth] = useState('Sep 26');

  const regions = useMemo(
    () => ['All Regions', ...Array.from(new Set((accounts ?? []).map((a) => a.region))).sort()],
    [accounts],
  );
  const accountOptions = useMemo(
    () => (accounts ?? []).filter((a) => region === 'All Regions' || a.region === region),
    [accounts, region],
  );
  useEffect(() => {
    if (accountOptions.length && !accountOptions.some((a) => Number(a.account_id) === accountId)) {
      setAccountId(Number(accountOptions[0].account_id));
    }
  }, [accountOptions, accountId]);

  const params = useMemo(() => ({ accountId: sql.int(accountId) }), [accountId]);
  const { data: kpiRows, loading: kpiLoading } = useAnalyticsQuery('account_kpis', params);
  const { data: monthly, loading: monthlyLoading } = useAnalyticsQuery('monthly_revenue', params);
  const { data: forecast } = useAnalyticsQuery('forecast_series', params);
  const { data: byLine } = useAnalyticsQuery('spares_by_line', params);
  const { data: parts } = useAnalyticsQuery('top_parts', useMemo(() => ({}), []));

  const kpi = kpiRows?.[0];

  const monthOptions = useMemo(() => (forecast ?? []).map((f) => f.month_label), [forecast]);
  useEffect(() => {
    if (monthOptions.length && !monthOptions.includes(month)) setMonth(monthOptions[0]);
  }, [monthOptions, month]);

  // spares trend (24 mo actual) + spares forecast (mix of total forecast)
  const trend = useMemo(() => {
    const actual = (monthly ?? []).map((m) => ({
      label: m.month_label, spares_revenue: Number(m.spares_revenue), spares_forecast: null as number | null,
    }));
    if (actual.length) actual[actual.length - 1].spares_forecast = actual[actual.length - 1].spares_revenue;
    const fc = (forecast ?? []).map((f) => ({
      label: f.month_label, spares_revenue: null as number | null,
      spares_forecast: Math.round(Number(f.total_revenue_forecast) * SPARES_MIX),
    }));
    return [...actual, ...fc];
  }, [monthly, forecast]);

  const byLineNum = useMemo(
    () => (byLine ?? []).map((r) => ({ product_line: r.product_line, annual_spares: Number(r.annual_spares), tools: Number(r.tools) })),
    [byLine],
  );

  const l12mSpares = kpi ? Number(kpi.l12m_spares) : 0;
  const l12mTotal = kpi ? Number(kpi.l12m_revenue) : 0;
  const sparesShare = l12mTotal ? (l12mSpares / l12mTotal) * 100 : 0;
  const sparesPerTool = kpi && Number(kpi.installed_base) ? l12mSpares / Number(kpi.installed_base) : 0;
  const next6Spares = kpi ? Number(kpi.next6_total) * SPARES_MIX : 0;
  const avgLead = parts?.length ? Math.round(parts.reduce((s, p) => s + Number(p.lead_time_days), 0) / parts.length) : 0;

  const [saving, setSaving] = useState<'idle' | 'draft' | 'submit'>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);

  async function persist(status: 'Draft' | 'Submitted') {
    if (!kpi) return;
    setSaving(status === 'Draft' ? 'draft' : 'submit');
    try {
      const r = await fetch('/api/submit-forecast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: kpi.account_id, account_name: kpi.account_name, region: kpi.region,
          version_id: versionId, forecast_month: month, next6_forecast: Math.round(next6Spares),
          confidence: kpi.forecast_confidence, status,
          drivers_json: JSON.stringify({ forecast_type: 'spares', spares_mix_pct: SPARES_MIX * 100 }),
          notes: `Spares forecast ${status.toLowerCase()} from Spares Cockpit.`,
        }),
      });
      if (!r.ok) throw new Error();
      setSubStatus(status);
      setToast(status === 'Submitted' ? 'Spares forecast submitted ✓' : 'Draft saved ✓');
    } catch { setToast('Save failed'); }
    finally { setSaving('idle'); setTimeout(() => setToast(null), 3500); }
  }

  return (
    <div className="space-y-4">
      {/* filter bar */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Account" className="min-w-[220px] flex-1">
            <Select value={String(accountId)} onValueChange={(v) => setAccountId(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accountOptions.map((a) => <SelectItem key={a.account_id} value={String(a.account_id)}>{a.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Region" className="w-[160px]">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Forecast Version" className="w-[170px]">
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(versions ?? []).map((v) => <SelectItem key={v.version_id} value={v.version_id}>{v.version_label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Month" className="w-[120px]">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{monthOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setSubStatus(null)}><RotateCcw className="h-4 w-4 mr-1.5" /> Reset</Button>
            <Button variant="outline" size="sm" disabled={saving !== 'idle'} onClick={() => persist('Draft')}><Save className="h-4 w-4 mr-1.5" /> {saving === 'draft' ? 'Saving…' : 'Save Draft'}</Button>
            <Button size="sm" className="bg-primary text-primary-foreground" disabled={saving !== 'idle'} onClick={() => persist('Submitted')}><Send className="h-4 w-4 mr-1.5" /> {saving === 'submit' ? 'Submitting…' : 'Submit Spares Forecast'}</Button>
          </div>
        </div>
        {toast && <div className="mt-2 text-sm text-success font-medium">{toast}</div>}
      </Card>

      {/* KPI row — spares-specific */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiLoading || !kpi ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <KpiCard label="Account" sub={`${kpi.region} · ${kpi.segment}`}><span className="text-lg">{kpi.account_name}</span></KpiCard>
            <KpiCard label="L12M Spares Rev." sub="Consumables + parts">{usd(l12mSpares)}</KpiCard>
            <KpiCard label="Spares Share" sub="of total service">{pct(sparesShare)}</KpiCard>
            <KpiCard label="Spares / Tool" sub="L12M per active tool">{usd(sparesPerTool)}</KpiCard>
            <KpiCard label="Next 6 Mo. Spares FC" sub={<span>Status: {subStatus ?? 'Working'}</span>}>{usd(next6Spares)}</KpiCard>
            <KpiCard label="Avg Part Lead Time" sub="top parts">{avgLead} <span className="text-base font-medium">days</span></KpiCard>
          </>
        )}
      </div>

      {/* Trends */}
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2"><Package className="h-4 w-4" /> Spares Consumption &amp; Demand</h2>
        <p className="text-sm text-muted-foreground mb-3">Spares revenue history and the driver-adjusted spares forecast.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Spares Revenue — 24 months + forecast</div>
            {monthlyLoading ? <Skeleton className="h-[240px] w-full" /> : (
              <ChartContainer config={sparesTrendConfig} className="h-[240px] w-full">
                <ComposedChart data={trend} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tickFormatter={(v) => usd(v)} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="spares_revenue" stroke="var(--color-spares_revenue)" strokeWidth={2} dot={false} connectNulls />
                  <Line dataKey="spares_forecast" stroke="var(--color-spares_forecast)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                </ComposedChart>
              </ChartContainer>
            )}
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Annual Spares by Product Line</div>
            <ChartContainer config={byLineConfig} className="h-[240px] w-full">
              <BarChart data={byLineNum} layout="vertical" margin={{ left: 20, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => usd(v)} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="product_line" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="annual_spares" fill="var(--color-annual_spares)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ChartContainer>
          </Card>
        </div>

        {/* Top spare parts */}
        <Card className="p-0 overflow-hidden mt-4">
          <div className="px-4 py-3 border-b text-sm font-medium">Top Spare Parts by Unit Value</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground text-left">
                  <th className="px-4 py-2.5">Part</th><th className="px-4 py-2.5">Part No.</th>
                  <th className="px-4 py-2.5">Product Line</th>
                  <th className="px-4 py-2.5 text-right">Unit Price</th><th className="px-4 py-2.5 text-right">Lead Time</th>
                </tr>
              </thead>
              <tbody>
                {(parts ?? []).map((p) => (
                  <tr key={p.part_id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.part_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{p.part_id}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">{p.product_line}</Badge></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{usd(p.unit_price_usd)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{num(p.lead_time_days)} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
