-- @param accountId INT
SELECT account_id, account_name, customer_group, region, segment, process_node, country,
       installed_base, new_installs_6mo, avg_utilization, at_risk_tools, avg_renewal_risk,
       l12m_revenue, l12m_prior, ytd_actual, prior_month_actual, l12m_spares, l12m_labor,
       yoy_pct, current_month_fc, next6_total, variance_vs_prior, variance_pct, forecast_confidence
FROM dante_classic_stable_catalog.asm_service_forecast.account_summary
WHERE account_id = :accountId
