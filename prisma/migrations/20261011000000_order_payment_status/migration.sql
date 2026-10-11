BEGIN;

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'FAILED', 'UNDERPAID', 'OVERPAID', 'EXPIRED');

-- AlterTable (existing orders default to AWAITING_PAYMENT; no table rewrite beyond the default)
ALTER TABLE "orders" ADD COLUMN     "payment_status" "payment_status" NOT NULL DEFAULT 'AWAITING_PAYMENT',
ADD COLUMN     "amount_received" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "event_id" VARCHAR(64) NOT NULL,
    "order_id" INTEGER NOT NULL,
    "outcome" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "payment_webhook_events_order_id_idx" ON "payment_webhook_events"("order_id");

COMMIT;
