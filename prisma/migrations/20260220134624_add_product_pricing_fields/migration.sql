-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" VARCHAR(100),
ADD COLUMN     "cost_price" DECIMAL(14,2),
ADD COLUMN     "manufacturer_code" VARCHAR(100),
ADD COLUMN     "origin" VARCHAR(100),
ADD COLUMN     "sale_price" DECIMAL(14,2),
ADD COLUMN     "supplier_id" BIGINT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
