-- @param accountId INT
SELECT date_format(month_start, 'MMM yy') AS month_label,
       cast(month_start AS STRING) AS month_start,
       total_revenue_forecast, total_revenue_lower, total_revenue_upper
FROM dante_classic_stable_catalog.asm_service_forecast.service_revenue_forecast
WHERE account_id = :accountId
ORDER BY month_start
