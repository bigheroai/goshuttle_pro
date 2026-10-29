-- Migration: Add admin user and sample data for testing
-- Created: 2025-11-08 07:44:16
-- Schema Analysis: Existing vehicles table without 'type' column
-- Integration Type: Fix column mismatch and add mock data
-- Dependencies: vehicles, user_profiles, bookings tables

-- Create admin user in auth.users - Fixed version without ON CONFLICT
DO $$
DECLARE
    admin_user_id UUID;
    existing_user_count INTEGER;
    vehicle_columns TEXT;
BEGIN
    -- Check if admin user already exists
    SELECT COUNT(*) INTO existing_user_count 
    FROM auth.users 
    WHERE email = 'admin@goshuttle.com';
    
    -- Only create if doesn't exist
    IF existing_user_count = 0 THEN
        -- Generate UUID for admin user
        admin_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            admin_user_id,
            'authenticated',
            'authenticated',
            'admin@goshuttle.com',
            crypt('admin123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "System Administrator", "role": "admin"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
        
        RAISE NOTICE 'Admin user created with ID: %', admin_user_id;
    ELSE
        -- Get existing admin user ID
        SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@goshuttle.com';
        RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
    END IF;
    
    -- Create or update admin profile
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        phone,
        role,
        loyalty_points,
        membership_tier,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        admin_user_id,
        'admin@goshuttle.com',
        'System Administrator',
        '+63917123456',
        'admin',
        0,
        'gold',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        is_active = true,
        updated_at = NOW();

    -- Check vehicles table structure and add sample vehicles if none exist
    -- Remove the problematic 'type' column that doesn't exist
    INSERT INTO public.vehicles (
        id,
        name,
        license_plate,
        capacity,
        status,
        driver_name,
        driver_phone,
        created_by,
        created_at,
        updated_at
    ) 
    SELECT 
        gen_random_uuid(),
        'Toyota Hiace ' || generate_series,
        'ABC' || LPAD(generate_series::text, 3, '0'),
        15,
        'active'::vehicle_status,
        'Driver ' || generate_series,
        '+63917' || LPAD((900000 + generate_series)::text, 6, '0'),
        admin_user_id,
        NOW(),
        NOW()
    FROM generate_series(1, 3)
    WHERE NOT EXISTS (SELECT 1 FROM public.vehicles LIMIT 1);

    -- Add sample bookings if none exist
    INSERT INTO public.bookings (
        id,
        user_id,
        vehicle_id,
        pickup_location,
        dropoff_location,
        pickup_datetime,
        passenger_count,
        status,
        total_amount,
        payment_status,
        payment_method,
        special_instructions,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        admin_user_id,
        v.id,
        'Makati CBD',
        'BGC Taguig',
        NOW() + (generate_series * interval '1 hour'),
        4 + (generate_series % 3),
        CASE 
            WHEN generate_series % 4 = 0 THEN 'confirmed'::booking_status
            WHEN generate_series % 4 = 1 THEN 'completed'::booking_status
            WHEN generate_series % 4 = 2 THEN 'in_progress'::booking_status
            ELSE 'pending'::booking_status
        END,
        1500.00 + (generate_series * 100),
        CASE 
            WHEN generate_series % 3 = 0 THEN 'paid'
            WHEN generate_series % 3 = 1 THEN 'pending'
            ELSE 'failed'
        END,
        CASE 
            WHEN generate_series % 2 = 0 THEN 'gcash'
            ELSE 'card'
        END,
        'Sample booking ' || generate_series,
        NOW() - (generate_series * interval '1 day'),
        NOW()
    FROM generate_series(1, 5), public.vehicles v
    WHERE NOT EXISTS (SELECT 1 FROM public.bookings LIMIT 1)
    LIMIT 5;

    RAISE NOTICE 'Admin user and sample data created successfully!';
    RAISE NOTICE 'Login credentials: admin@goshuttle.com / admin123';
    
EXCEPTION
    WHEN undefined_column THEN
        RAISE NOTICE 'Column does not exist: %', SQLERRM;
        RAISE NOTICE 'Please check the vehicles table structure and adjust the migration accordingly.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration error: %', SQLERRM;
        RAISE NOTICE 'Error details: %', SQLSTATE;
END $$;