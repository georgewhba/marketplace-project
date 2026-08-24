-- Custom SQL migration file, put you code below! --
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT date_trunc('day', created_at) AS day, vendor_id,
       SUM(total)::numeric AS gross_sales, COUNT(DISTINCT order_id) AS order_count
FROM order_items 
WHERE vendor_status = 'delivered'
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS daily_sales_summary_day_vendor_idx ON daily_sales_summary(day, vendor_id);