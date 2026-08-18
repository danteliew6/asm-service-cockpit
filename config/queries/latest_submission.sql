-- @param accountId INT
SELECT status, confidence, submitted_by, cast(submitted_at AS STRING) AS submitted_at,
       next6_forecast, forecast_month, version_id
FROM dante_classic_stable_catalog.asm_service_forecast.forecast_submissions
WHERE account_id = :accountId
ORDER BY submitted_at DESC
LIMIT 1
