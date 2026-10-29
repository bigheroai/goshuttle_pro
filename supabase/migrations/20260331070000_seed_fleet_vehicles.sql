-- Seed GoShuttle Fleet Vehicles
-- This migration inserts the available fleet vehicles that users can select during booking.
-- Vehicle types supported: van, shuttle, executive_car, corporate_car

DO $$
BEGIN
  -- Insert GoShuttle fleet vehicles with ON CONFLICT DO NOTHING for idempotency
  -- Vehicles are inserted without created_by (admin-managed fleet, no auth dependency)

  -- SHUTTLE VEHICLES
  INSERT INTO public.vehicles (
    id, name, vehicle_type, license_plate, capacity,
    image_url, description, features, status, daily_rate
  ) VALUES
  (
    gen_random_uuid(),
    'GoShuttle Standard',
    'shuttle'::public.vehicle_type,
    'GS-SHT-001',
    10,
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
    'Comfortable 10-seater shuttle perfect for group travel and airport transfers.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Reclining Seats", "Luggage Storage"]'::jsonb,
    'active'::public.vehicle_status,
    350.00
  ),
  (
    gen_random_uuid(),
    'GoShuttle Express',
    'shuttle'::public.vehicle_type,
    'GS-SHT-002',
    14,
    'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80',
    'Spacious 14-seater express shuttle ideal for corporate groups and events.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Reclining Seats", "Luggage Storage", "Entertainment System"]'::jsonb,
    'active'::public.vehicle_status,
    450.00
  ),

  -- VAN VEHICLES
  (
    gen_random_uuid(),
    'GoVan Comfort',
    'van'::public.vehicle_type,
    'GS-VAN-001',
    7,
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'Versatile 7-seater van for family trips, airport runs, and small group transfers.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Spacious Cabin", "Luggage Space"]'::jsonb,
    'active'::public.vehicle_status,
    280.00
  ),
  (
    gen_random_uuid(),
    'GoVan Premium',
    'van'::public.vehicle_type,
    'GS-VAN-002',
    9,
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80',
    'Premium 9-seater van with enhanced comfort features for longer journeys.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Leather Seats", "Tinted Windows", "Luggage Storage"]'::jsonb,
    'active'::public.vehicle_status,
    320.00
  ),

  -- EXECUTIVE CAR VEHICLES
  (
    gen_random_uuid(),
    'GoExec Sedan',
    'executive_car'::public.vehicle_type,
    'GS-EXC-001',
    4,
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
    'Elegant executive sedan for business travel, VIP transfers, and airport pickups.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Leather Seats", "Privacy Glass", "Bottled Water"]'::jsonb,
    'active'::public.vehicle_status,
    500.00
  ),
  (
    gen_random_uuid(),
    'GoExec SUV',
    'executive_car'::public.vehicle_type,
    'GS-EXC-002',
    6,
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
    'Luxury executive SUV combining space and sophistication for premium travel.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Premium Leather Seats", "Privacy Glass", "Bottled Water", "Sunroof"]'::jsonb,
    'active'::public.vehicle_status,
    650.00
  ),

  -- CORPORATE CAR VEHICLES
  (
    gen_random_uuid(),
    'GoCorp Standard',
    'corporate_car'::public.vehicle_type,
    'GS-CRP-001',
    4,
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80',
    'Professional corporate sedan for daily business commutes and client meetings.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Professional Interior", "GPS Navigation"]'::jsonb,
    'active'::public.vehicle_status,
    400.00
  ),
  (
    gen_random_uuid(),
    'GoCorp MPV',
    'corporate_car'::public.vehicle_type,
    'GS-CRP-002',
    6,
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
    'Corporate multi-purpose vehicle for team travel and client transportation.',
    '["Air Conditioning", "WiFi", "USB Charging Ports", "Professional Interior", "GPS Navigation", "Extra Luggage Space"]'::jsonb,
    'active'::public.vehicle_status,
    480.00
  )
  ON CONFLICT (license_plate) DO NOTHING;

  RAISE NOTICE 'GoShuttle fleet vehicles seeded successfully.';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Fleet vehicle seeding encountered an issue: %', SQLERRM;
END $$;
