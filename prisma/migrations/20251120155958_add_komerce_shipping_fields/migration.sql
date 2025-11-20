-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCostEstimatedMax" DECIMAL(12,2),
ADD COLUMN     "shippingCostEstimatedMin" DECIMAL(12,2),
ADD COLUMN     "shippingCostOriginal" DECIMAL(12,2),
ADD COLUMN     "shippingName" TEXT,
ADD COLUMN     "shippingServiceName" TEXT;
