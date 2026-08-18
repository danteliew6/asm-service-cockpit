SELECT account_id, account_name, customer_group, region, segment,
       installed_base, l12m_revenue, next6_total, yoy_pct, forecast_confidence, at_risk_tools
FROM dante_classic_stable_catalog.asm_service_forecast.account_summary
ORDER BY l12m_revenue DESC
