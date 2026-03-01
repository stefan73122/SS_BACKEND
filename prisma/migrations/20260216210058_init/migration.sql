-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('REGULAR', 'PREFERENCIAL');

-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('PRINCIPAL', 'HERRAMIENTAS', 'ELECTRICO', 'CONTROL');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INGRESO', 'EGRESO', 'TRANSFERENCIA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "MovementReason" AS ENUM ('COMPRA', 'PROYECTO', 'KIT', 'DEVOLUCION', 'AJUSTE_MANUAL', 'VENTA', 'SERVICIO');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CONTADO', 'CREDITO');

-- CreateEnum
CREATE TYPE "QuoteItemType" AS ENUM ('PRODUCT', 'SERVICE', 'KIT');

-- CreateEnum
CREATE TYPE "HiddenCostType" AS ENUM ('MANO_DE_OBRA', 'TRANSPORTE', 'ACCESORIOS', 'MATERIAL');

-- CreateEnum
CREATE TYPE "StockCheckStatus" AS ENUM ('DISPONIBLE', 'PARCIAL', 'SIN_STOCK');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANIFICACION', 'EN_CURSO', 'PAUSADO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "company_settings" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nit" VARCHAR(50),
    "email" VARCHAR(120),
    "phone" VARCHAR(50),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "logo_path" VARCHAR(255),
    "default_currency" VARCHAR(10) NOT NULL DEFAULT 'BOB',
    "default_credit_days" INTEGER DEFAULT 60,
    "default_credit_markup" DECIMAL(5,2) DEFAULT 15.00,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "module" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "document_type" VARCHAR(20),
    "document_num" VARCHAR(50),
    "email" VARCHAR(120),
    "phone" VARCHAR(50),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "client_type" "ClientType" NOT NULL DEFAULT 'REGULAR',
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "credit_enabled" BOOLEAN NOT NULL DEFAULT false,
    "credit_days" INTEGER DEFAULT 60,
    "credit_markup_percent" DECIMAL(5,2) DEFAULT 15.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "document_type" VARCHAR(20),
    "document_num" VARCHAR(50),
    "email" VARCHAR(120),
    "phone" VARCHAR(50),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" BIGSERIAL NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "category_id" BIGINT,
    "unit_id" BIGINT NOT NULL,
    "is_service" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "min_stock_global" DECIMAL(14,2) DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "type" "WarehouseType" NOT NULL DEFAULT 'PRINCIPAL',
    "parent_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_stock" (
    "id" BIGSERIAL NOT NULL,
    "warehouse_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "warehouse_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" BIGSERIAL NOT NULL,
    "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MovementType" NOT NULL,
    "reason" "MovementReason" NOT NULL,
    "warehouse_from_id" BIGINT,
    "warehouse_to_id" BIGINT,
    "related_module" VARCHAR(50),
    "related_id" BIGINT,
    "supplier_id" BIGINT,
    "created_by" BIGINT NOT NULL,
    "note" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement_items" (
    "id" BIGSERIAL NOT NULL,
    "inventory_movement_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "unit_cost" DECIMAL(14,4),
    "total_cost" DECIMAL(14,4),

    CONSTRAINT "inventory_movement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kits" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_items" (
    "id" BIGSERIAL NOT NULL,
    "kit_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" BIGSERIAL NOT NULL,
    "quote_number" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "client_id" BIGINT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'BORRADOR',
    "payment_type" "PaymentType" NOT NULL DEFAULT 'CONTADO',
    "valid_until" DATE,
    "issue_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'BOB',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "terms_conditions" TEXT,
    "observations" TEXT,
    "pdf_path" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" BIGSERIAL NOT NULL,
    "quote_id" BIGINT NOT NULL,
    "item_type" "QuoteItemType" NOT NULL DEFAULT 'PRODUCT',
    "product_id" BIGINT,
    "kit_id" BIGINT,
    "description" TEXT,
    "quantity" DECIMAL(14,2) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL,
    "unit_price_base" DECIMAL(14,4),
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER DEFAULT 0,
    "is_kit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_item_details" (
    "id" BIGSERIAL NOT NULL,
    "quote_item_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "quote_item_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_item_hidden_costs" (
    "id" BIGSERIAL NOT NULL,
    "quote_item_id" BIGINT NOT NULL,
    "cost_type" "HiddenCostType" NOT NULL,
    "description" VARCHAR(255),
    "quantity" DECIMAL(14,2) DEFAULT 1,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "total_cost" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "quote_item_hidden_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_item_stock_checks" (
    "id" BIGSERIAL NOT NULL,
    "quote_item_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "required_qty" DECIMAL(14,2) NOT NULL,
    "available_qty" DECIMAL(14,2) NOT NULL,
    "warehouse_id" BIGINT,
    "status" "StockCheckStatus" NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_item_stock_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" BIGSERIAL NOT NULL,
    "project_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "client_id" BIGINT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANIFICACION',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIA',
    "start_date" DATE,
    "end_date" DATE,
    "estimated_budget" DECIMAL(14,2) DEFAULT 0,
    "actual_cost" DECIMAL(14,2) DEFAULT 0,
    "assigned_to" BIGINT,
    "created_by" BIGINT NOT NULL,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" BIGSERIAL NOT NULL,
    "service_code" VARCHAR(50) NOT NULL,
    "client_id" BIGINT NOT NULL,
    "project_id" BIGINT,
    "quote_id" BIGINT,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "start_date" DATE,
    "end_date" DATE,
    "assigned_to" BIGINT,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_services" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "service_order_id" BIGINT NOT NULL,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_quotes" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "quote_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_tasks" (
    "id" BIGSERIAL NOT NULL,
    "service_order_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDIENTE',
    "performed_by" BIGINT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),

    CONSTRAINT "service_order_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_materials" (
    "id" BIGSERIAL NOT NULL,
    "service_order_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "warehouse_id" BIGINT NOT NULL,
    "inventory_movement_id" BIGINT,
    "note" VARCHAR(255),

    CONSTRAINT "service_order_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_labor" (
    "id" BIGSERIAL NOT NULL,
    "service_order_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "hours_worked" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hourly_rate" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "service_order_labor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules_registry" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" VARCHAR(20) DEFAULT '1.0.0',
    "config_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "modules_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_custom_fields" (
    "id" BIGSERIAL NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "field_name" VARCHAR(100) NOT NULL,
    "field_type" "FieldType" NOT NULL DEFAULT 'TEXT',
    "field_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "entity_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" BIGINT,
    "old_values" TEXT,
    "new_values" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports_log" (
    "id" BIGSERIAL NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "generated_by" BIGINT NOT NULL,
    "parameters" TEXT,
    "file_path" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "idx_products_sku" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "idx_warehouses_parent" ON "warehouses"("parent_id");

-- CreateIndex
CREATE INDEX "idx_warehouse_stock_warehouse" ON "warehouse_stock"("warehouse_id");

-- CreateIndex
CREATE INDEX "idx_warehouse_stock_product" ON "warehouse_stock"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_stock_warehouse_id_product_id_key" ON "warehouse_stock"("warehouse_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_inv_movements_type" ON "inventory_movements"("type");

-- CreateIndex
CREATE INDEX "idx_inv_movements_date" ON "inventory_movements"("movement_date");

-- CreateIndex
CREATE INDEX "idx_inv_movements_supplier" ON "inventory_movements"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_inv_movement_items_movement" ON "inventory_movement_items"("inventory_movement_id");

-- CreateIndex
CREATE UNIQUE INDEX "kits_code_key" ON "kits"("code");

-- CreateIndex
CREATE INDEX "idx_kit_items_kit" ON "kit_items"("kit_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_number_key" ON "quotes"("quote_number");

-- CreateIndex
CREATE INDEX "idx_quotes_client" ON "quotes"("client_id");

-- CreateIndex
CREATE INDEX "idx_quotes_status" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "idx_quotes_number" ON "quotes"("quote_number");

-- CreateIndex
CREATE INDEX "idx_quote_items_quote" ON "quote_items"("quote_id");

-- CreateIndex
CREATE INDEX "idx_quote_item_details_item" ON "quote_item_details"("quote_item_id");

-- CreateIndex
CREATE INDEX "idx_quote_hidden_costs_item" ON "quote_item_hidden_costs"("quote_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_code_key" ON "projects"("project_code");

-- CreateIndex
CREATE INDEX "idx_projects_client" ON "projects"("client_id");

-- CreateIndex
CREATE INDEX "idx_projects_status" ON "projects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_service_code_key" ON "service_orders"("service_code");

-- CreateIndex
CREATE INDEX "idx_service_orders_client" ON "service_orders"("client_id");

-- CreateIndex
CREATE INDEX "idx_service_orders_project" ON "service_orders"("project_id");

-- CreateIndex
CREATE INDEX "idx_service_orders_status" ON "service_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_services_project_id_service_order_id_key" ON "project_services"("project_id", "service_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_quotes_project_id_quote_id_key" ON "project_quotes"("project_id", "quote_id");

-- CreateIndex
CREATE INDEX "idx_service_tasks_order" ON "service_order_tasks"("service_order_id");

-- CreateIndex
CREATE INDEX "idx_service_materials_order" ON "service_order_materials"("service_order_id");

-- CreateIndex
CREATE INDEX "idx_service_labor_order" ON "service_order_labor"("service_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "modules_registry_code_key" ON "modules_registry"("code");

-- CreateIndex
CREATE INDEX "idx_custom_fields_entity" ON "entity_custom_fields"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_custom_fields_entity_type_entity_id_field_name_key" ON "entity_custom_fields"("entity_type", "entity_id", "field_name");

-- CreateIndex
CREATE INDEX "idx_audit_log_user" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_entity" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_date" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_from_id_fkey" FOREIGN KEY ("warehouse_from_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_to_id_fkey" FOREIGN KEY ("warehouse_to_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_items" ADD CONSTRAINT "inventory_movement_items_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_items" ADD CONSTRAINT "inventory_movement_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits" ADD CONSTRAINT "kits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_details" ADD CONSTRAINT "quote_item_details_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "quote_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_hidden_costs" ADD CONSTRAINT "quote_item_hidden_costs_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "quote_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_stock_checks" ADD CONSTRAINT "quote_item_stock_checks_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "quote_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_stock_checks" ADD CONSTRAINT "quote_item_stock_checks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_stock_checks" ADD CONSTRAINT "quote_item_stock_checks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_quotes" ADD CONSTRAINT "project_quotes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_quotes" ADD CONSTRAINT "project_quotes_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_tasks" ADD CONSTRAINT "service_order_tasks_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_tasks" ADD CONSTRAINT "service_order_tasks_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_materials" ADD CONSTRAINT "service_order_materials_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_materials" ADD CONSTRAINT "service_order_materials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_materials" ADD CONSTRAINT "service_order_materials_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_materials" ADD CONSTRAINT "service_order_materials_inventory_movement_id_fkey" FOREIGN KEY ("inventory_movement_id") REFERENCES "inventory_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_labor" ADD CONSTRAINT "service_order_labor_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_labor" ADD CONSTRAINT "service_order_labor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_log" ADD CONSTRAINT "reports_log_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
