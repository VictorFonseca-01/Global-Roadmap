-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: asset_categories
CREATE TABLE IF NOT EXISTS asset_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    icon text,
    color text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: roadmap_projects
CREATE TABLE IF NOT EXISTS roadmap_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text NOT NULL, -- operating_systems | licenses | hardware | network | custom
    scope text, -- workstation | server | datacenter | corporate
    status text DEFAULT 'draft', -- draft | active | completed | archived
    description text,
    owner text,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: lifecycle_catalog
CREATE TABLE IF NOT EXISTS lifecycle_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES asset_categories(id),
    vendor text NOT NULL,
    product_name text NOT NULL,
    model text,
    version text,
    asset_type text, -- software | hardware | license | service
    release_date date,
    end_of_support date NOT NULL,
    extended_support_end date,
    successor_version text,
    is_supported boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: applications
CREATE TABLE IF NOT EXISTS applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    vendor text,
    current_version text,
    criticality text, -- low | medium | high | critical
    owner_department text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: assets
CREATE TABLE IF NOT EXISTS assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname text NOT NULL,
    asset_tag text,
    device_type text, -- workstation | server | network | storage | custom
    category_id uuid REFERENCES asset_categories(id),
    lifecycle_id uuid REFERENCES lifecycle_catalog(id),
    application_id uuid REFERENCES applications(id),
    owner_department text,
    business_criticality text, -- low | medium | high | critical
    cpu text,
    ram_gb numeric,
    storage_gb numeric,
    purchase_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: application_compatibility
CREATE TABLE IF NOT EXISTS application_compatibility (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid REFERENCES applications(id),
    lifecycle_id uuid REFERENCES lifecycle_catalog(id), -- Changed from os_id to lifecycle_id for consistency
    compatibility_status text, -- compatible | needs_testing | incompatible
    notes text
);

-- Table: migration_plans
CREATE TABLE IF NOT EXISTS migration_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_project_id uuid REFERENCES roadmap_projects(id),
    asset_id uuid REFERENCES assets(id),
    priority text, -- critical | high | medium | low
    risk_level text, -- critical | high | medium | low
    status text, -- planned | testing | pilot | in_progress | completed | blocked
    recommended_target_os text,
    recommended_start_date date,
    planned_start_date date,
    planned_end_date date,
    estimated_cost numeric,
    justification text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: import_history
CREATE TABLE IF NOT EXISTS import_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text,
    total_records integer,
    successful_records integer,
    failed_records integer,
    imported_at timestamp with time zone DEFAULT now()
);

-- Seed Initial Categories
INSERT INTO asset_categories (name, icon, color, description) VALUES
('Operating Systems', 'monitor', '#3b82f6', 'Client and Server Operating Systems'),
('Software Licenses', 'key', '#ef4444', 'Application and OS licensing'),
('Computers', 'laptop', '#10b981', 'Workstations, laptops and desktops'),
('Servers', 'server', '#8b5cf6', 'Physical and Virtual Servers'),
('Motherboards', 'circuit-board', '#f59e0b', 'Computer motherboards'),
('Graphics Cards', 'gpu', '#6366f1', 'Video and graphics processing units'),
('CPUs', 'cpu', '#ec4899', 'Central Processing Units'),
('Memory', 'memory', '#14b8a6', 'RAM modules'),
('Storage', 'database', '#f97316', 'HDD, SSD and SAN storage'),
('Network Equipment', 'network', '#06b6d4', 'Switches, routers and firewalls'),
('Peripherals', 'mouse', '#71717a', 'Mice, keyboards, monitors'),
('Custom', 'plus', '#000000', 'Other technological assets')
ON CONFLICT (name) DO NOTHING;

-- Seed initial Windows lifecycle data
-- Note: You'll need to fetch the category_id for 'Operating Systems' first in a real scenario,
-- but for a script we can use a subquery.

DO $$
DECLARE
    os_cat_id uuid;
BEGIN
    SELECT id INTO os_cat_id FROM asset_categories WHERE name = 'Operating Systems';

    INSERT INTO lifecycle_catalog (category_id, vendor, product_name, version, asset_type, release_date, end_of_support, extended_support_end, is_supported)
    VALUES
    (os_cat_id, 'Microsoft', 'Windows 10', '22H2', 'software', '2022-10-18', '2025-10-14', NULL, true),
    (os_cat_id, 'Microsoft', 'Windows 11', '23H2', 'software', '2023-10-31', '2025-11-11', NULL, true),
    (os_cat_id, 'Microsoft', 'Windows Server', '2016', 'software', '2016-10-15', '2022-01-11', '2027-01-12', true),
    (os_cat_id, 'Microsoft', 'Windows Server', '2019', 'software', '2018-11-13', '2024-01-09', '2029-01-09', true),
    (os_cat_id, 'Microsoft', 'Windows Server', '2022', 'software', '2021-08-18', '2026-10-13', '2031-10-14', true)
    ON CONFLICT DO NOTHING;
END $$;
