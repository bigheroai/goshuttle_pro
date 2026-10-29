-- Migration: Add destination restrictions and global excess hourly rate to app_settings
-- These settings are admin-controlled

DO $$
BEGIN
  -- Insert destination restrictions setting (all destinations enabled by default)
  INSERT INTO public.app_settings (setting_key, setting_value)
  VALUES (
    'destination_restrictions',
    '{
      "enabled": false,
      "allowed_destinations": [
        "Quezon City", "Makati", "Tagaytay", "Calamba", "Sto. Tomas Batangas",
        "Alabang", "Cavite", "Manila", "Pasig", "Taguig", "Mandaluyong",
        "Pasay", "Parañaque", "Las Piñas", "Muntinlupa", "Marikina",
        "Valenzuela", "Malabon", "Navotas", "San Juan", "Batangas City",
        "Lipa", "Lucena", "Antipolo", "San Pedro", "Biñan", "Santa Rosa"
      ],
      "restricted_destinations": []
    }'::jsonb
  )
  ON CONFLICT (setting_key) DO NOTHING;

  -- Insert global default excess hourly rate setting
  INSERT INTO public.app_settings (setting_key, setting_value)
  VALUES (
    'global_excess_hourly_rate',
    '{"rate": 300, "base_hours": 10, "notes": "Default excess hourly rate when no specific rate sheet is matched"}'::jsonb
  )
  ON CONFLICT (setting_key) DO NOTHING;

  RAISE NOTICE 'Destination restrictions and global excess hourly rate settings added.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Settings migration encountered an issue: %', SQLERRM;
END $$;
