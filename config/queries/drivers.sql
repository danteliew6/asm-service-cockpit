-- @param accountId INT
SELECT install_base_growth_pct, spares_price_uplift_pct, contract_renewal_rate_pct,
       labor_rate_uplift_pct, new_tool_installs_6mo
FROM dante_classic_stable_catalog.asm_service_forecast.forecast_drivers
WHERE account_id = :accountId AND version_id = 'v1'
