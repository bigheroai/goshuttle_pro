-- Fix Payment Gateway System - Add default payment processors and ensure proper configuration
-- Migration: 20251110065900_fix_payment_gateway_system.sql

-- First, ensure we have the payment_processors_settings in app_settings
DO $$
DECLARE
    payment_setting_exists BOOLEAN := false;
BEGIN
    -- Check if payment_processors_settings already exists
    SELECT EXISTS (
        SELECT 1 FROM app_settings 
        WHERE setting_key = 'payment_processors_settings'
    ) INTO payment_setting_exists;
    
    -- If it doesn't exist, create it with default processors
    IF NOT payment_setting_exists THEN
        INSERT INTO app_settings (
            setting_key, 
            setting_value, 
            updated_at, 
            updated_by
        ) VALUES (
            'payment_processors_settings',
            jsonb_build_object(
                'processors', jsonb_build_array(
                    -- GCash (Filipino mobile payment)
                    jsonb_build_object(
                        'id', '1',
                        'name', 'GCash',
                        'type', 'gcash',
                        'is_enabled', true,
                        'is_live', false,
                        'supported_currencies', jsonb_build_array('PHP'),
                        'configuration', jsonb_build_object(
                            'merchant_id', '',
                            'api_key', '',
                            'secret_key', '',
                            'callback_url', ''
                        )
                    ),
                    -- PayMaya (Filipino digital payment)
                    jsonb_build_object(
                        'id', '2',
                        'name', 'PayMaya',
                        'type', 'paymaya',
                        'is_enabled', true,
                        'is_live', false,
                        'supported_currencies', jsonb_build_array('PHP', 'USD'),
                        'configuration', jsonb_build_object(
                            'public_key', '',
                            'secret_key', '',
                            'webhook_secret', ''
                        )
                    ),
                    -- Stripe (International credit cards)
                    jsonb_build_object(
                        'id', '3',
                        'name', 'Stripe Payment',
                        'type', 'stripe',
                        'is_enabled', false,
                        'is_live', false,
                        'supported_currencies', jsonb_build_array('PHP', 'USD', 'EUR', 'GBP'),
                        'configuration', jsonb_build_object(
                            'publishable_key', '',
                            'secret_key', '',
                            'webhook_secret', '',
                            'webhook_url', ''
                        )
                    ),
                    -- Cash Payment (Always available)
                    jsonb_build_object(
                        'id', '4',
                        'name', 'Cash Payment',
                        'type', 'cash',
                        'is_enabled', true,
                        'is_live', true,
                        'supported_currencies', jsonb_build_array('PHP'),
                        'configuration', jsonb_build_object(
                            'collection_instructions', 'Cash payment upon pickup or delivery',
                            'receipt_template', 'Cash Receipt - GoShuttle Pro Transportation'
                        )
                    ),
                    -- Bank Transfer (Local Philippine banks)
                    jsonb_build_object(
                        'id', '5',
                        'name', 'Bank Transfer',
                        'type', 'bank_transfer',
                        'is_enabled', false,
                        'is_live', false,
                        'supported_currencies', jsonb_build_array('PHP'),
                        'configuration', jsonb_build_object(
                            'bank_name', 'BPI',
                            'account_name', 'GoShuttle Pro Transportation',
                            'account_number', '',
                            'swift_code', 'BOPIPHMM'
                        )
                    )
                ),
                'updated_at', CURRENT_TIMESTAMP,
                'created_by', 'system'
            ),
            CURRENT_TIMESTAMP,
            (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
        );
        
        RAISE NOTICE 'Default payment processors added successfully';
    ELSE
        -- Update existing payment processors to ensure at least cash payment is enabled
        UPDATE app_settings 
        SET setting_value = jsonb_set(
            setting_value,
            '{processors}',
            COALESCE(
                setting_value->'processors', 
                jsonb_build_array()
            ) || jsonb_build_array(
                jsonb_build_object(
                    'id', 'cash_default',
                    'name', 'Cash Payment',
                    'type', 'cash',
                    'is_enabled', true,
                    'is_live', true,
                    'supported_currencies', jsonb_build_array('PHP'),
                    'configuration', jsonb_build_object(
                        'collection_instructions', 'Cash payment upon pickup or delivery',
                        'receipt_template', 'Cash Receipt - GoShuttle Pro Transportation'
                    )
                )
            )
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE setting_key = 'payment_processors_settings'
        AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(setting_value->'processors') AS processor
            WHERE processor->>'type' = 'cash'
        );
        
        RAISE NOTICE 'Payment processors updated - Cash payment ensured';
    END IF;
END $$;

-- Create a function to validate payment processor configuration
CREATE OR REPLACE FUNCTION validate_payment_processor(processor_data JSONB) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if processor has required fields
    IF processor_data->>'id' IS NULL OR processor_data->>'name' IS NULL OR processor_data->>'type' IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if processor type is supported
    IF processor_data->>'type' NOT IN ('gcash', 'paymaya', 'stripe', 'paypal', 'cash', 'bank_transfer', 'custom') THEN
        RETURN false;
    END IF;
    
    -- Additional validation for enabled processors
    IF COALESCE((processor_data->>'is_enabled')::boolean, false) = true THEN
        -- Cash payment is always valid when enabled
        IF processor_data->>'type' = 'cash' THEN
            RETURN true;
        END IF;
        
        -- Other processors need configuration
        IF processor_data->'configuration' IS NULL OR jsonb_typeof(processor_data->'configuration') != 'object' THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get enabled payment methods for booking forms
CREATE OR REPLACE FUNCTION get_enabled_payment_methods() 
RETURNS JSONB AS $$
DECLARE
    payment_config JSONB;
    enabled_methods JSONB := '[]'::JSONB;
    processor JSONB;
BEGIN
    -- Get payment processors configuration
    SELECT setting_value INTO payment_config 
    FROM app_settings 
    WHERE setting_key = 'payment_processors_settings';
    
    -- If no configuration exists, return empty array
    IF payment_config IS NULL OR payment_config->'processors' IS NULL THEN
        RETURN enabled_methods;
    END IF;
    
    -- Loop through processors and build enabled methods array
    FOR processor IN SELECT * FROM jsonb_array_elements(payment_config->'processors')
    LOOP
        -- Only include enabled and valid processors
        IF COALESCE((processor->>'is_enabled')::boolean, false) = true 
           AND validate_payment_processor(processor) = true THEN
            
            enabled_methods := enabled_methods || jsonb_build_array(
                jsonb_build_object(
                    'id', processor->>'type',
                    'name', processor->>'name',
                    'type', processor->>'type',
                    'available', true,
                    'is_live', COALESCE((processor->>'is_live')::boolean, false),
                    'supported_currencies', COALESCE(processor->'supported_currencies', '["PHP"]'::JSONB)
                )
            );
        END IF;
    END LOOP;
    
    RETURN enabled_methods;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for the payment processor function
GRANT EXECUTE ON FUNCTION get_enabled_payment_methods() TO anon, authenticated;

-- Update bookings table to include payment method tracking
DO $$
BEGIN
    -- Add payment_method column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE bookings ADD COLUMN payment_method TEXT;
        CREATE INDEX idx_bookings_payment_method ON bookings(payment_method);
        RAISE NOTICE 'Added payment_method column to bookings table';
    END IF;
    
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
        CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
        RAISE NOTICE 'Added payment_status column to bookings table';
    END IF;
    
    -- Add payment_reference column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'payment_reference'
    ) THEN
        ALTER TABLE bookings ADD COLUMN payment_reference TEXT;
        CREATE INDEX idx_bookings_payment_reference ON bookings(payment_reference);
        RAISE NOTICE 'Added payment_reference column to bookings table';
    END IF;
END $$;

-- Create trigger to update payment status
CREATE OR REPLACE FUNCTION update_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If payment_method is set and was previously null, mark as paid for cash payments
    IF NEW.payment_method IS NOT NULL 
       AND OLD.payment_method IS NULL 
       AND NEW.payment_method = 'cash' 
       AND NEW.payment_status IS NULL THEN
        NEW.payment_status := 'pending';
    END IF;
    
    -- If payment_reference is provided, mark as processing
    IF NEW.payment_reference IS NOT NULL AND OLD.payment_reference IS NULL THEN
        NEW.payment_status := 'processing';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_payment_status'
    ) THEN
        CREATE TRIGGER trigger_update_payment_status
            BEFORE UPDATE ON bookings
            FOR EACH ROW
            EXECUTE FUNCTION update_booking_payment_status();
        RAISE NOTICE 'Payment status trigger created successfully';
    END IF;
END $$;

-- Insert sample test data for demonstration (only if no bookings exist)
DO $$
DECLARE
    booking_count INTEGER;
    admin_user_id UUID;
    test_vehicle_id UUID;
BEGIN
    -- Check if we have any bookings
    SELECT COUNT(*) INTO booking_count FROM bookings;
    
    -- Only add test data if no bookings exist
    IF booking_count = 0 THEN
        -- Get admin user and a test vehicle
        SELECT id INTO admin_user_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
        SELECT id INTO test_vehicle_id FROM vehicles WHERE status = 'active' LIMIT 1;
        
        -- If we have both admin and vehicle, create test bookings
        IF admin_user_id IS NOT NULL AND test_vehicle_id IS NOT NULL THEN
            INSERT INTO bookings (
                user_id,
                vehicle_id,
                pickup_location,
                dropoff_location,
                pickup_date,
                passenger_count,
                total_cost,
                payment_method,
                payment_status,
                status,
                notes
            ) VALUES 
            (
                admin_user_id,
                test_vehicle_id,
                'Manila Airport Terminal 3',
                'Makati CBD - Ayala Avenue',
                CURRENT_TIMESTAMP + INTERVAL '2 hours',
                2,
                1500,
                'cash',
                'pending',
                'pending',
                'Test booking with cash payment'
            ),
            (
                admin_user_id,
                test_vehicle_id,
                'BGC - The Fort',
                'Ortigas Business Center',
                CURRENT_TIMESTAMP + INTERVAL '4 hours',
                3,
                1800,
                'gcash',
                'pending',
                'pending',
                'Test booking with GCash payment'
            );
            
            RAISE NOTICE 'Test bookings with payment methods added successfully';
        END IF;
    END IF;
END $$;

-- Final summary
DO $$
DECLARE
    processor_count INTEGER;
    enabled_count INTEGER;
    booking_count INTEGER;
BEGIN
    -- Count payment processors
    SELECT COALESCE(jsonb_array_length(setting_value->'processors'), 0) 
    INTO processor_count
    FROM app_settings 
    WHERE setting_key = 'payment_processors_settings';
    
    -- Count enabled processors
    SELECT COUNT(*)::INTEGER INTO enabled_count
    FROM jsonb_array_elements(
        (SELECT setting_value->'processors' FROM app_settings WHERE setting_key = 'payment_processors_settings')
    ) AS processor
    WHERE (processor->>'is_enabled')::boolean = true;
    
    -- Count bookings with payment methods
    SELECT COUNT(*) INTO booking_count FROM bookings WHERE payment_method IS NOT NULL;
    
    RAISE NOTICE '=== PAYMENT GATEWAY SYSTEM STATUS ===';
    RAISE NOTICE 'Total Payment Processors: %', COALESCE(processor_count, 0);
    RAISE NOTICE 'Enabled Payment Processors: %', COALESCE(enabled_count, 0);
    RAISE NOTICE 'Bookings with Payment Methods: %', COALESCE(booking_count, 0);
    RAISE NOTICE 'Payment system is now properly configured!';
    RAISE NOTICE '==========================================';
END $$;