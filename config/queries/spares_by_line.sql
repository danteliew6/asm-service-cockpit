-- @param accountId INT
SELECT product_line,
       count(*) AS tools,
       cast(round(sum(annual_service_value) * 0.52) AS BIGINT) AS annual_spares
FROM dante_classic_stable_catalog.asm_service_forecast.installed_base
WHERE account_id = :accountId AND status = 'Active'
GROUP BY product_line
ORDER BY annual_spares DESC
