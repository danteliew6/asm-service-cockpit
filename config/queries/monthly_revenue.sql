-- @param accountId INT
SELECT date_format(month_start, 'MMM yy') AS month_label,
       cast(month_start AS STRING) AS month_start,
       total_revenue, spares_revenue, labor_revenue, contract_revenue, active_tools,
       cast(round(total_revenue / nullif(active_tools,0)) AS BIGINT) AS revenue_per_tool
FROM dante_classic_stable_catalog.asm_service_forecast.service_revenue_monthly
WHERE account_id = :accountId
ORDER BY month_start
