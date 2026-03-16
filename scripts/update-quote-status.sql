-- Script para actualizar el enum QuoteStatus de BORRADOR a PENDIENTE

-- Modificar el enum para reemplazar BORRADOR con PENDIENTE
ALTER TYPE "QuoteStatus" RENAME VALUE 'BORRADOR' TO 'PENDIENTE';
