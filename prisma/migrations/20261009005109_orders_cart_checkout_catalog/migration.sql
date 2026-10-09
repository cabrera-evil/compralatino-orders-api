/*
  Warnings:

  - Added the required column `product_code` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "purchase_intent_source" AS ENUM ('BID', 'BUY_NOW');

-- CreateEnum
CREATE TYPE "checkout_option_kind" AS ENUM ('DELIVERY_METHOD', 'PAYMENT_METHOD', 'PICKUP_POINT', 'DEPARTMENT');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "orders_user_id_idx";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "product_code" VARCHAR(64) NOT NULL,
ADD COLUMN     "title" VARCHAR(255) NOT NULL,
ADD COLUMN     "unit_price_jpy" DECIMAL(12,2),
ALTER COLUMN "product_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_full_name" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(32),
ADD COLUMN     "delivery_method_code" VARCHAR(64),
ADD COLUMN     "destination" TEXT,
ADD COLUMN     "intent_source" "purchase_intent_source",
ADD COLUMN     "payment_method_code" VARCHAR(64),
ADD COLUMN     "pickup_point_code" VARCHAR(64),
ADD COLUMN     "total_amount_jpy" DECIMAL(14,2),
ADD COLUMN     "tracking_state_id" INTEGER;

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_code" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "seller_name" VARCHAR(255) NOT NULL,
    "product_status" VARCHAR(32) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit_price_jpy" DECIMAL(12,2) NOT NULL,
    "exchanged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_options" (
    "id" SERIAL NOT NULL,
    "kind" "checkout_option_kind" NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "checkout_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_statuses" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_states" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tracking_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_id_product_code_key" ON "cart_items"("user_id", "product_code");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_options_kind_code_key" ON "checkout_options"("kind", "code");

-- CreateIndex
CREATE UNIQUE INDEX "order_statuses_code_key" ON "order_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_states_code_key" ON "tracking_states"("code");

-- CreateIndex
CREATE INDEX "order_items_product_code_idx" ON "order_items"("product_code");

-- CreateIndex
CREATE INDEX "orders_user_id_order_date_idx" ON "orders"("user_id", "order_date");

-- CreateIndex
CREATE INDEX "orders_tracking_state_id_idx" ON "orders"("tracking_state_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tracking_state_id_fkey" FOREIGN KEY ("tracking_state_id") REFERENCES "tracking_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
