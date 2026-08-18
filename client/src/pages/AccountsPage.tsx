import { useMemo } from 'react';
import { Card, Badge, Skeleton, useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { usd, num, pct } from '../lib/format';

export function AccountsPage() {
  const { data, loading } = useAnalyticsQuery('portfolio', useMemo(() => ({}), []));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Service Accounts — Portfolio</h2>
        <p className="text-sm text-muted-foreground">Installed base and aftermarket service book across all fab accounts.</p>
      </div>
      <Card className="p-0 overflow-hidden">
        {loading || !data ? (
          <div className="p-4"><Skeleton className="h-80 w-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground text-left">
                  <th className="px-4 py-2.5">Account</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Region</th>
                  <th className="px-4 py-2.5">Segment</th>
                  <th className="px-4 py-2.5 text-right">Installed Base</th>
                  <th className="px-4 py-2.5 text-right">L12M Revenue</th>
                  <th className="px-4 py-2.5 text-right">YoY</th>
                  <th className="px-4 py-2.5 text-right">Next 6 Mo.</th>
                  <th className="px-4 py-2.5 text-right">At-Risk Tools</th>
                  <th className="px-4 py-2.5">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.account_id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.account_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.customer_group}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.region}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.segment}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{num(r.installed_base)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{usd(r.l12m_revenue)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${r.yoy_pct >= 0 ? 'text-success' : 'text-destructive'}`}>{pct(r.yoy_pct)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{usd(r.next6_total)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.at_risk_tools > 0 ? <span className="text-warning">{r.at_risk_tools}</span> : '0'}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={
                          r.forecast_confidence === 'High' ? 'text-success border-success/30'
                            : r.forecast_confidence === 'Medium' ? 'text-warning border-warning/30'
                              : 'text-destructive border-destructive/30'
                        }
                      >
                        {r.forecast_confidence}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
