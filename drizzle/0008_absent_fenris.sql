CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "commission_target_idx" ON "commission_rules" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "payouts_vendor_idx" ON "payout_requests" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payout_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_order_idx" ON "refund_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refunds_customer_idx" ON "refund_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "settlements_vendor_idx" ON "settlements" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "settlements_status_idx" ON "settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alerts_product_idx" ON "stock_alerts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "events_shipment_idx" ON "shipment_events" USING btree ("shipment_id");