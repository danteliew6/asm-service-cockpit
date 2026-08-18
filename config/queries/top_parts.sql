SELECT part_id, part_name, product_line, unit_price_usd, lead_time_days
FROM dante_classic_stable_catalog.asm_service_forecast.spare_parts
ORDER BY unit_price_usd DESC
LIMIT 10
