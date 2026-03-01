-- CreateEnum
CREATE TYPE "QuoteType" AS ENUM ('PRODUCTOS', 'SERVICIOS');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "quote_type" "QuoteType" NOT NULL DEFAULT 'PRODUCTOS';
