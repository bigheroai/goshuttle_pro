-- Consolidated GoShuttle Pro schema, rebuilt from the Supabase migrations.
-- Access control is enforced by the app's server data API (src/server/db), not by row-level security.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET check_function_bodies = false;

-- Compatibility shim: database functions call auth.uid(). The server sets
-- app.user_id (the signed-in user's profile id) for each request transaction.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN 'anon' ELSE 'authenticated' END
$$;

CREATE TYPE public.approval_status_type AS ENUM (
    'pending_approval',
    'approved',
    'rejected',
    'cancelled'
);

CREATE TYPE public.assignment_status AS ENUM (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE public.audit_action_type AS ENUM (
    'user_created',
    'user_updated',
    'user_deactivated',
    'user_activated',
    'user_role_changed',
    'driver_created',
    'kyc_approved',
    'kyc_rejected',
    'kyc_under_review',
    'dispute_created',
    'dispute_resolved',
    'dispute_rejected',
    'booking_created',
    'booking_cancelled',
    'booking_assigned',
    'booking_updated',
    'role_created',
    'role_updated',
    'role_deleted',
    'staff_role_assigned',
    'payment_refunded',
    'vehicle_created',
    'vehicle_updated',
    'vehicle_deactivated',
    'partner_created',
    'partner_updated',
    'settings_updated',
    'other'
);

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE public.destination_zone AS ENUM (
    'metro_manila',
    'luzon_nearby',
    'luzon_far',
    'visayas',
    'mindanao',
    'international'
);

CREATE TYPE public.dispute_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE public.dispute_status AS ENUM (
    'open',
    'under_review',
    'awaiting_response',
    'resolved_won',
    'resolved_lost',
    'resolved_partial',
    'closed'
);

CREATE TYPE public.dispute_type AS ENUM (
    'chargeback',
    'dispute',
    'failed_reversal'
);

CREATE TYPE public.driver_status AS ENUM (
    'available',
    'busy',
    'offline',
    'on_break'
);

CREATE TYPE public.fleet_type AS ENUM (
    'goshuttle_main',
    'partner_fleet'
);

CREATE TYPE public.ledger_entry_type AS ENUM (
    'trip_charge',
    'payment',
    'adjustment',
    'credit'
);

CREATE TYPE public.membership_tier AS ENUM (
    'bronze',
    'silver',
    'gold',
    'platinum'
);

CREATE TYPE public.message_status AS ENUM (
    'sent',
    'delivered',
    'read'
);

CREATE TYPE public.payable_entry_type AS ENUM (
    'trip_earning',
    'deduction',
    'bonus',
    'payment'
);

CREATE TYPE public.preference_category AS ENUM (
    'travel',
    'communication',
    'accessibility',
    'routes'
);

CREATE TYPE public.statement_status_type AS ENUM (
    'draft',
    'issued',
    'paid',
    'overdue',
    'partially_paid'
);

CREATE TYPE public.support_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

CREATE TYPE public.support_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
);

CREATE TYPE public.transaction_type AS ENUM (
    'earned',
    'redeemed',
    'expired',
    'adjustment'
);

CREATE TYPE public.trip_category AS ENUM (
    'airport_transfer',
    'city_tour',
    'provincial',
    'corporate_daily',
    'event_transfer',
    'multi_day'
);

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'corporate_manager',
    'employee',
    'customer',
    'driver',
    'partner_fleet_manager',
    'partner_fleet',
    'staff',
    'partner',
    'super_admin'
);

CREATE TYPE public.vehicle_status AS ENUM (
    'active',
    'maintenance',
    'inactive'
);

CREATE TYPE public.vehicle_type AS ENUM (
    'van',
    'shuttle',
    'executive_car',
    'corporate_car'
);

CREATE FUNCTION public.admin_create_user_profile(p_user_id uuid, p_email text, p_full_name text, p_role text, p_phone text DEFAULT NULL::text, p_staff_role_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    phone,
    staff_role_id,
    notes,
    created_by_admin,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_role::public.user_role,
    p_phone,
    p_staff_role_id,
    p_notes,
    p_created_by,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    staff_role_id = EXCLUDED.staff_role_id,
    notes = EXCLUDED.notes,
    updated_at = now();

  RETURN p_user_id;
END;
$$;

CREATE FUNCTION public.award_booking_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    points_to_award INTEGER;
    new_tier public.membership_tier;
BEGIN
    -- Award points only when booking is completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Calculate points: 1 point per 100 pesos spent, minimum 10 points
        points_to_award := GREATEST(FLOOR((NEW.total_cost / 100)::INTEGER), 10);
        
        -- Update user points
        UPDATE public.user_profiles 
        SET 
            loyalty_points = loyalty_points + points_to_award,
            points_lifetime = points_lifetime + points_to_award
        WHERE id = NEW.user_id;
        
        -- Record points transaction
        INSERT INTO public.points_transactions (
            user_id, 
            booking_id, 
            transaction_type, 
            points_amount, 
            description
        ) VALUES (
            NEW.user_id, 
            NEW.id, 
            'earned'::public.transaction_type, 
            points_to_award, 
            'Points earned from booking completion'
        );
        
        -- Check and update membership tier
        SELECT public.calculate_membership_tier(points_lifetime) INTO new_tier
        FROM public.user_profiles 
        WHERE id = NEW.user_id;
        
        UPDATE public.user_profiles 
        SET 
            membership_tier = new_tier,
            tier_updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id AND membership_tier != new_tier;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.calculate_membership_tier(total_points integer) RETURNS public.membership_tier
    LANGUAGE sql STABLE
    AS $$
    SELECT CASE 
        WHEN total_points >= 10000 THEN 'platinum'::public.membership_tier
        WHEN total_points >= 5000 THEN 'gold'::public.membership_tier  
        WHEN total_points >= 2000 THEN 'silver'::public.membership_tier
        ELSE 'bronze'::public.membership_tier
    END;
$$;

CREATE FUNCTION public.generate_booking_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    code TEXT;
    exists BOOLEAN DEFAULT true;
BEGIN
    WHILE exists LOOP
        -- Generate 8 character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_code = code) INTO exists;
    END LOOP;
    
    RETURN code;
END;
$$;

CREATE FUNCTION public.generate_conversation_id(user1_id uuid, user2_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
SELECT 
  CASE 
    WHEN user1_id < user2_id THEN 
      gen_random_uuid()
    ELSE 
      gen_random_uuid()
  END;
$$;

CREATE FUNCTION public.get_applicable_rate(p_vehicle_type text, p_trip_category text, p_destination_zone text) RETURNS TABLE(id uuid, base_rate numeric, base_hours integer, excess_hourly_rate numeric, multi_day_rate numeric, fuel_surcharge numeric, notes text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    rs.id,
    rs.base_rate,
    rs.base_hours,
    rs.excess_hourly_rate,
    rs.multi_day_rate,
    rs.fuel_surcharge,
    rs.notes
  FROM public.rate_sheets rs
  WHERE rs.vehicle_type = p_vehicle_type
    AND rs.trip_category = p_trip_category::public.trip_category
    AND rs.destination_zone = p_destination_zone::public.destination_zone
    AND rs.is_active = true
  LIMIT 1;
END;
$$;

CREATE FUNCTION public.get_booking_with_relations(booking_uuid uuid) RETURNS TABLE(id uuid, booking_code text, user_id uuid, guest_name text, guest_email text, guest_phone text, pickup_location text, dropoff_location text, pickup_date timestamp with time zone, return_date timestamp with time zone, passenger_count integer, vehicle_id uuid, notes text, total_cost numeric, status public.booking_status, is_guest_booking boolean, created_at timestamp with time zone, updated_at timestamp with time zone, customer_name text, customer_email text, customer_phone text, vehicle_name text, vehicle_type public.vehicle_type, vehicle_capacity integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.booking_code,
    b.user_id,
    b.guest_name,
    b.guest_email,
    b.guest_phone,
    b.pickup_location,
    b.dropoff_location,
    b.pickup_date,
    b.return_date,
    b.passenger_count,
    b.vehicle_id,
    b.notes,
    b.total_cost,
    b.status,
    b.is_guest_booking,
    b.created_at,
    b.updated_at,
    -- User profile data (null for guest bookings)
    up.full_name as customer_name,
    up.email as customer_email,
    up.phone as customer_phone,
    -- Vehicle data
    v.name as vehicle_name,
    v.vehicle_type,
    v.capacity as vehicle_capacity
  FROM bookings b
  LEFT JOIN user_profiles up ON b.user_id = up.id
  LEFT JOIN vehicles v ON b.vehicle_id = v.id
  WHERE b.id = booking_uuid;
END;
$$;

CREATE FUNCTION public.get_company_contact_details() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  contact_details jsonb;
BEGIN
  SELECT setting_value INTO contact_details
  FROM public.app_settings
  WHERE setting_key = 'company_contact_details';
  
  -- Return default values if not configured
  IF contact_details IS NULL THEN
    contact_details := '{
      "company_name": "GoShuttle Philippines",
      "support_email": "support@goshuttle.com",
      "support_phone": "+63 2 8123 4567",
      "hotline_phone": "+63 917 123 4567",
      "emergency_phone": "+63 998 765 4321",
      "address": "Makati City, Philippines",
      "business_hours": "Monday - Sunday: 24/7 Support Available",
      "website": "https://goshuttle.com"
    }'::jsonb;
  END IF;
  
  RETURN contact_details;
END;
$$;

CREATE FUNCTION public.get_conversation_id(user1_id uuid, user2_id uuid, booking_uuid uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    existing_conversation_id UUID;
    new_conversation_id UUID;
BEGIN
    -- Try to find existing conversation for this booking
    SELECT DISTINCT conversation_id INTO existing_conversation_id
    FROM public.communications c
    WHERE c.booking_id = booking_uuid
    AND c.conversation_id IS NOT NULL
    LIMIT 1;
    
    -- If conversation exists, return it
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- Create new conversation ID
    new_conversation_id := gen_random_uuid();
    
    RETURN new_conversation_id;
END;
$$;

CREATE FUNCTION public.get_enabled_payment_methods() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;

CREATE FUNCTION public.get_user_managed_entities(user_uuid uuid) RETURNS TABLE(entity_type text, entity_id uuid, entity_name text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    -- Get all entities created or updated by the user
    SELECT 'partner'::TEXT, p.id, p.name, p.created_at, p.updated_at
    FROM public.partners p
    WHERE p.created_by = user_uuid OR p.updated_by = user_uuid
    
    UNION ALL
    
    SELECT 'company'::TEXT, c.id, c.name, c.created_at, c.updated_at
    FROM public.companies c
    WHERE c.created_by = user_uuid OR c.updated_by = user_uuid
    
    UNION ALL
    
    SELECT 'vehicle'::TEXT, v.id, v.name, v.created_at, v.updated_at
    FROM public.vehicles v
    WHERE v.created_by = user_uuid
    
    ORDER BY updated_at DESC;
$$;

CREATE FUNCTION public.has_partner_fleet_role() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
          AND up.role = 'partner_fleet'
          AND up.is_active = true
)
$$;

CREATE FUNCTION public.is_admin_from_auth() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role::text IN ('admin', 'super_admin', 'superadmin')
      AND COALESCE(up.is_active, true)
  );
$$;

CREATE FUNCTION public.is_admin_from_profile() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role::text IN ('admin', 'super_admin', 'superadmin')
      AND up.is_active = true
  );
$$;

CREATE FUNCTION public.is_admin_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'super_admin')
  );
$$;

CREATE FUNCTION public.is_partner_fleet_owner(partner_uuid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
SELECT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_uuid 
          AND p.created_by = auth.uid()
          AND p.is_active = true
)
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.driver_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    partner_id uuid,
    full_name text NOT NULL,
    phone text NOT NULL,
    license_number text,
    license_expiry date,
    vehicle_owned boolean DEFAULT false,
    vehicle_details jsonb DEFAULT '{}'::jsonb,
    application_status text DEFAULT 'pending'::text,
    background_check_status text DEFAULT 'pending'::text,
    documents_uploaded jsonb DEFAULT '[]'::jsonb,
    preferred_fleet_type text DEFAULT 'goshuttle'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approved_at timestamp with time zone,
    approved_by uuid,
    kyc_status text DEFAULT 'pending'::text,
    kyc_notes text,
    kyc_verified_at timestamp with time zone,
    kyc_verified_by uuid,
    document_verification_notes jsonb DEFAULT '{}'::jsonb,
    rejection_reason text,
    email text,
    address text,
    emergency_contact text,
    emergency_phone text,
    driving_experience text,
    license_type text,
    license_restrictions text,
    previous_violations text,
    doc_review_statuses jsonb DEFAULT '{}'::jsonb,
    admin_feedback text,
    next_action text,
    signup_email_sent boolean DEFAULT false,
    pending_email_sent boolean DEFAULT false,
    doc_request_email_sent boolean DEFAULT false
);

CREATE FUNCTION public.lookup_driver_application_by_email(lookup_email text) RETURNS SETOF public.driver_applications
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.driver_applications
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(lookup_email))
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$;

CREATE FUNCTION public.mark_messages_as_read(p_conversation_id uuid, p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.communications
    SET 
        message_status = 'read',
        read_at = CURRENT_TIMESTAMP
    WHERE conversation_id = p_conversation_id
    AND recipient_id = p_user_id
    AND message_status != 'read';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

CREATE FUNCTION public.post_trip_to_corporate_billing() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_billing_account_id UUID;
  v_company_id UUID;
  v_running_balance NUMERIC(12,2);
  v_passenger_name TEXT;
  v_vehicle_name TEXT;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get company_id from booking user's profile
    SELECT up.company_id INTO v_company_id
    FROM public.user_profiles up
    WHERE up.id = NEW.user_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get billing account for this company
    SELECT id INTO v_billing_account_id
    FROM public.corporate_billing_accounts
    WHERE company_id = v_company_id AND is_active = true
    LIMIT 1;

    IF v_billing_account_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get passenger name
    SELECT full_name INTO v_passenger_name
    FROM public.user_profiles WHERE id = NEW.user_id LIMIT 1;

    -- Get vehicle name
    SELECT name INTO v_vehicle_name
    FROM public.vehicles WHERE id = NEW.vehicle_id LIMIT 1;

    -- Get current running balance
    SELECT COALESCE(current_balance, 0) INTO v_running_balance
    FROM public.corporate_billing_accounts
    WHERE id = v_billing_account_id;

    v_running_balance := v_running_balance + COALESCE(NEW.total_cost, 0);

    -- Insert ledger entry
    INSERT INTO public.corporate_billing_ledger (
      billing_account_id, company_id, booking_id, entry_type,
      amount, running_balance, description, reference_number,
      trip_date, passenger_name, pickup_location, dropoff_location, vehicle_name,
      posted_at
    ) VALUES (
      v_billing_account_id, v_company_id, NEW.id, 'trip_charge',
      COALESCE(NEW.total_cost, 0), v_running_balance,
      'Trip charge - ' || COALESCE(NEW.pickup_location, '') || ' to ' || COALESCE(NEW.dropoff_location, ''),
      COALESCE(NEW.booking_code, NEW.id::TEXT),
      NEW.pickup_date, v_passenger_name,
      NEW.pickup_location, NEW.dropoff_location, v_vehicle_name,
      now()
    );

    -- Update billing account balance
    UPDATE public.corporate_billing_accounts
    SET current_balance = v_running_balance, updated_at = now()
    WHERE id = v_billing_account_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.post_trip_to_partner_payable() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_driver_id UUID;
  v_payable_account_id UUID;
  v_rate_value NUMERIC(8,4);
  v_rate_type TEXT;
  v_driver_amount NUMERIC(12,2);
  v_running_balance NUMERIC(12,2);
  v_passenger_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get assigned driver from driver_assignments
    SELECT da.driver_id INTO v_driver_id
    FROM public.driver_assignments da
    WHERE da.booking_id = NEW.id
    LIMIT 1;

    IF v_driver_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get payable account for this driver
    SELECT id, driver_rate_value, driver_rate_type
    INTO v_payable_account_id, v_rate_value, v_rate_type
    FROM public.partner_payable_accounts
    WHERE driver_id = v_driver_id AND is_active = true
    LIMIT 1;

    IF v_payable_account_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Calculate driver amount
    IF v_rate_type = 'percentage' THEN
      v_driver_amount := ROUND(COALESCE(NEW.total_cost, 0) * v_rate_value, 2);
    ELSE
      v_driver_amount := v_rate_value;
    END IF;

    -- Get passenger name
    SELECT full_name INTO v_passenger_name
    FROM public.user_profiles WHERE id = NEW.user_id LIMIT 1;

    -- Get current running balance
    SELECT COALESCE(current_balance, 0) INTO v_running_balance
    FROM public.partner_payable_accounts
    WHERE id = v_payable_account_id;

    v_running_balance := v_running_balance + v_driver_amount;

    -- Insert payable ledger entry
    INSERT INTO public.partner_payable_ledger (
      payable_account_id, booking_id, entry_type,
      gross_fare, driver_rate_value, driver_rate_type,
      amount, running_balance, description,
      trip_date, passenger_name, pickup_location, dropoff_location,
      posted_at
    ) VALUES (
      v_payable_account_id, NEW.id, 'trip_earning',
      COALESCE(NEW.total_cost, 0), v_rate_value, v_rate_type,
      v_driver_amount, v_running_balance,
      'Trip earning - ' || COALESCE(NEW.pickup_location, '') || ' to ' || COALESCE(NEW.dropoff_location, ''),
      NEW.pickup_date, v_passenger_name,
      NEW.pickup_location, NEW.dropoff_location,
      now()
    );

    -- Update payable account balances
    UPDATE public.partner_payable_accounts
    SET current_balance = v_running_balance,
        total_earned = total_earned + v_driver_amount,
        updated_at = now()
    WHERE id = v_payable_account_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.redeem_points(redeem_user_id uuid, points_to_redeem integer, redeem_description text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    current_points INTEGER;
BEGIN
    -- Check if user has enough points
    SELECT loyalty_points INTO current_points
    FROM public.user_profiles
    WHERE id = redeem_user_id;
    
    IF current_points < points_to_redeem THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct points
    UPDATE public.user_profiles
    SET loyalty_points = loyalty_points - points_to_redeem
    WHERE id = redeem_user_id;
    
    -- Record redemption transaction
    INSERT INTO public.points_transactions (
        user_id,
        transaction_type,
        points_amount,
        description
    ) VALUES (
        redeem_user_id,
        'redeemed'::public.transaction_type,
        points_to_redeem,
        redeem_description
    );
    
    RETURN TRUE;
END;
$$;

CREATE FUNCTION public.send_communication_message(p_booking_id uuid, p_sender_id uuid, p_recipient_id uuid, p_message_content text, p_message_type text DEFAULT 'sms'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    communication_id UUID;
    recipient_phone TEXT;
BEGIN
    -- Get recipient phone number
    SELECT phone INTO recipient_phone
    FROM public.user_profiles
    WHERE id = p_recipient_id;
    
    -- Insert communication record
    INSERT INTO public.communications (
        booking_id,
        sender_id,
        recipient_id,
        message_content,
        message_type,
        phone_number
    ) VALUES (
        p_booking_id,
        p_sender_id,
        p_recipient_id,
        p_message_content,
        p_message_type,
        recipient_phone
    ) RETURNING id INTO communication_id;
    
    RETURN communication_id;
END;
$$;

CREATE FUNCTION public.send_in_app_message(p_booking_id uuid, p_sender_id uuid, p_recipient_id uuid, p_message_content text, p_message_thread text DEFAULT 'general'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    conversation_uuid UUID;
    new_message_id UUID;
BEGIN
    -- Get or create conversation
    conversation_uuid := public.get_conversation_id(p_sender_id, p_recipient_id, p_booking_id);
    
    -- Insert the message
    INSERT INTO public.communications (
        id,
        booking_id,
        sender_id,
        recipient_id,
        message_content,
        message_type,
        message_status,
        is_real_time,
        conversation_id,
        message_thread,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_booking_id,
        p_sender_id,
        p_recipient_id,
        p_message_content,
        'in_app',
        'sent',
        true,
        conversation_uuid,
        p_message_thread,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO new_message_id;
    
    RETURN new_message_id;
END;
$$;

CREATE FUNCTION public.set_booking_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.booking_code IS NULL THEN
        NEW.booking_code = public.generate_booking_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.submit_driver_application(p_full_name text, p_email text, p_phone text, p_preferred_fleet_type text DEFAULT 'goshuttle'::text, p_partner_id uuid DEFAULT NULL::uuid, p_documents_uploaded jsonb DEFAULT '[]'::jsonb, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_id UUID;
BEGIN
  INSERT INTO public.driver_applications (
    user_id,
    full_name,
    email,
    phone,
    preferred_fleet_type,
    partner_id,
    documents_uploaded,
    application_status,
    background_check_status
  ) VALUES (
    p_user_id,
    p_full_name,
    p_email,
    p_phone,
    COALESCE(p_preferred_fleet_type, 'goshuttle'),
    p_partner_id,
    COALESCE(p_documents_uploaded, '[]'::JSONB),
    'pending',
    'pending'
  )
  RETURNING id INTO v_id;

  SELECT row_to_json(da)::JSONB INTO v_result
  FROM public.driver_applications da
  WHERE da.id = v_id;

  RETURN v_result;
END;
$$;

CREATE FUNCTION public.update_booking_payment_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

CREATE FUNCTION public.update_favorite_bookings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_payment_disputes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_routes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_bulk_bookings() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_payment_processor(processor_data jsonb) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;

CREATE TABLE public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type public.audit_action_type NOT NULL,
    actor_id uuid,
    actor_name text,
    actor_role text,
    target_id text,
    target_type text,
    target_name text,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.booking_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    company_id uuid,
    maker_id uuid NOT NULL,
    approver_id uuid,
    approval_status public.approval_status_type DEFAULT 'pending_approval'::public.approval_status_type NOT NULL,
    maker_notes text,
    approver_notes text,
    submitted_at timestamp with time zone DEFAULT now(),
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    vehicle_id uuid,
    pickup_location text NOT NULL,
    dropoff_location text NOT NULL,
    pickup_date timestamp with time zone NOT NULL,
    return_date timestamp with time zone,
    passenger_count integer DEFAULT 1,
    status public.booking_status DEFAULT 'pending'::public.booking_status,
    total_cost numeric(10,2),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    guest_email text,
    guest_name text,
    guest_phone text,
    booking_code text,
    is_guest_booking boolean DEFAULT false,
    cancel_reason text,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    payment_reference text,
    primary_passenger_first_name text,
    primary_passenger_last_name text,
    primary_passenger_email text,
    primary_passenger_phone text,
    is_flagged boolean DEFAULT false,
    flag_reason text,
    flag_note text,
    flagged_at timestamp with time zone,
    ops_intervention_note text,
    ops_intervened_at timestamp with time zone,
    email_confirmation_status text,
    email_confirmation_sent_at timestamp with time zone,
    email_confirmation_delivered_at timestamp with time zone,
    email_confirmation_failed_at timestamp with time zone,
    email_confirmation_error text,
    email_confirmation_resend_id text,
    email_confirmation_recipient text,
    excess_hours_used integer DEFAULT 0,
    extension_total numeric DEFAULT 0,
    approval_status public.approval_status_type,
    approver_id uuid,
    approved_at timestamp with time zone,
    approval_notes text,
    submitted_for_approval_at timestamp with time zone
);

CREATE TABLE public.bulk_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    created_by uuid,
    booking_name text NOT NULL,
    pickup_location text NOT NULL,
    dropoff_location text NOT NULL,
    pickup_date timestamp with time zone NOT NULL,
    vehicle_id uuid,
    employee_ids text[] NOT NULL,
    notes text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.cms_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_slug text NOT NULL,
    page_title text NOT NULL,
    page_content text DEFAULT ''::text,
    meta_description text DEFAULT ''::text,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    footer_column text DEFAULT 'company'::text,
    CONSTRAINT cms_pages_footer_column_check CHECK ((footer_column = ANY (ARRAY['company'::text, 'legal'::text])))
);

CREATE TABLE public.communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    sender_id uuid,
    recipient_id uuid,
    message_type text DEFAULT 'sms'::text NOT NULL,
    message_content text NOT NULL,
    message_status public.message_status DEFAULT 'sent'::public.message_status,
    twilio_message_sid text,
    phone_number text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    is_real_time boolean DEFAULT true,
    conversation_id uuid,
    message_thread text,
    attachment_url text
);

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo_url text,
    contact_email text,
    contact_phone text,
    address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.company_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    employee_name text NOT NULL,
    employee_email text NOT NULL,
    department text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.corporate_billing_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    account_name text NOT NULL,
    credit_limit numeric(12,2) DEFAULT 0,
    current_balance numeric(12,2) DEFAULT 0,
    billing_cycle text DEFAULT 'monthly'::text,
    billing_day integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT corporate_billing_accounts_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['weekly'::text, 'bi_weekly'::text, 'monthly'::text])))
);

CREATE TABLE public.corporate_billing_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    billing_account_id uuid NOT NULL,
    company_id uuid NOT NULL,
    booking_id uuid,
    entry_type public.ledger_entry_type DEFAULT 'trip_charge'::public.ledger_entry_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    running_balance numeric(12,2) DEFAULT 0,
    description text,
    reference_number text,
    trip_date timestamp with time zone,
    passenger_name text,
    pickup_location text,
    dropoff_location text,
    vehicle_name text,
    posted_by uuid,
    posted_at timestamp with time zone DEFAULT now(),
    statement_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.corporate_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    vehicle_type public.vehicle_type NOT NULL,
    daily_rate numeric(10,2) NOT NULL,
    monthly_rate numeric(10,2),
    discount_percentage numeric(5,2) DEFAULT 0,
    min_booking_hours integer DEFAULT 1,
    is_active boolean DEFAULT true,
    valid_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.corporate_statements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    billing_account_id uuid NOT NULL,
    company_id uuid NOT NULL,
    statement_number text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_trips integer DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    amount_paid numeric(12,2) DEFAULT 0,
    balance_due numeric(12,2) DEFAULT 0,
    statement_status public.statement_status_type DEFAULT 'draft'::public.statement_status_type,
    due_date date,
    issued_at timestamp with time zone,
    paid_at timestamp with time zone,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.corporate_vehicle_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    vehicle_id uuid,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by uuid,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.dispute_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dispute_id uuid NOT NULL,
    author_id uuid,
    author_name text NOT NULL,
    author_role text DEFAULT 'admin'::text NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    attachment_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.domain_allowlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    description text,
    added_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.driver_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    driver_id uuid,
    assigned_by uuid,
    assignment_status public.assignment_status DEFAULT 'pending'::public.assignment_status,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    earnings numeric(10,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.driver_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid,
    trip_date date NOT NULL,
    trips_completed integer DEFAULT 0,
    total_earnings numeric(10,2) DEFAULT 0.00,
    average_rating numeric(3,2) DEFAULT 0.00,
    punctuality_score numeric(3,2) DEFAULT 0.00,
    safety_incidents integer DEFAULT 0,
    customer_complaints integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.driver_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    partner_id uuid,
    license_number text NOT NULL,
    license_expiry date NOT NULL,
    vehicle_id uuid,
    current_status public.driver_status DEFAULT 'available'::public.driver_status,
    current_location jsonb,
    last_location_update timestamp with time zone,
    rating numeric(3,2) DEFAULT 0.00,
    total_trips integer DEFAULT 0,
    fleet_type public.fleet_type DEFAULT 'goshuttle_main'::public.fleet_type,
    is_verified boolean DEFAULT false,
    qualifications jsonb DEFAULT '[]'::jsonb,
    availability_schedule jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.driver_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid,
    partner_id uuid,
    work_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.driver_signup_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    license_number text NOT NULL,
    license_expiry date NOT NULL,
    partner_id uuid,
    fleet_type public.fleet_type DEFAULT 'goshuttle_main'::public.fleet_type,
    documents jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_key text NOT NULL,
    template_name text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid
);

CREATE TABLE public.favorite_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'My Favorite Route'::text NOT NULL,
    route_from text DEFAULT ''::text NOT NULL,
    route_to text DEFAULT ''::text NOT NULL,
    vehicle_id uuid,
    vehicle_name text,
    vehicle_type text,
    vehicle_price numeric,
    payment_method text,
    passenger_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.guest_account_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    guest_email text NOT NULL,
    invitation_token text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval),
    used_at timestamp with time zone
);

CREATE TABLE public.membership_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tier public.membership_tier NOT NULL,
    benefit_type text NOT NULL,
    benefit_value numeric,
    benefit_description text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.partner_payable_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid,
    driver_id uuid,
    account_name text NOT NULL,
    driver_rate_type text DEFAULT 'percentage'::text,
    driver_rate_value numeric(8,4) DEFAULT 0.80,
    current_balance numeric(12,2) DEFAULT 0,
    total_earned numeric(12,2) DEFAULT 0,
    total_paid numeric(12,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT partner_payable_accounts_driver_rate_type_check CHECK ((driver_rate_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);

CREATE TABLE public.partner_payable_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payable_account_id uuid NOT NULL,
    booking_id uuid,
    entry_type public.payable_entry_type DEFAULT 'trip_earning'::public.payable_entry_type NOT NULL,
    gross_fare numeric(12,2) DEFAULT 0,
    driver_rate_value numeric(8,4) DEFAULT 0.80,
    driver_rate_type text DEFAULT 'percentage'::text,
    amount numeric(12,2) NOT NULL,
    running_balance numeric(12,2) DEFAULT 0,
    description text,
    trip_date timestamp with time zone,
    passenger_name text,
    pickup_location text,
    dropoff_location text,
    posted_by uuid,
    posted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.partner_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid,
    vehicle_id uuid,
    assigned_driver_id uuid,
    assignment_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);

CREATE TABLE public.partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text,
    contact_email text,
    contact_phone text,
    address text,
    logo_url text,
    specialization text,
    partnership_type text DEFAULT 'transport_partner'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE public.payment_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    dispute_type public.dispute_type DEFAULT 'dispute'::public.dispute_type NOT NULL,
    dispute_status public.dispute_status DEFAULT 'open'::public.dispute_status NOT NULL,
    priority public.dispute_priority DEFAULT 'medium'::public.dispute_priority NOT NULL,
    title text NOT NULL,
    description text,
    amount numeric(10,2),
    currency text DEFAULT 'PHP'::text,
    payment_reference text,
    payment_method text,
    customer_name text,
    customer_email text,
    assigned_to uuid,
    resolution_notes text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    due_date date,
    external_reference text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.points_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    booking_id uuid,
    transaction_type public.transaction_type NOT NULL,
    points_amount integer NOT NULL,
    description text NOT NULL,
    reference_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    CONSTRAINT points_transactions_points_amount_check CHECK ((points_amount > 0))
);

CREATE TABLE public.rate_sheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_type text NOT NULL,
    trip_category public.trip_category NOT NULL,
    destination_zone public.destination_zone NOT NULL,
    base_rate numeric(10,2) DEFAULT 0 NOT NULL,
    base_hours integer DEFAULT 10 NOT NULL,
    excess_hourly_rate numeric(10,2) DEFAULT 0 NOT NULL,
    multi_day_rate numeric(10,2),
    fuel_surcharge numeric(10,2) DEFAULT 0,
    notes text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_location text NOT NULL,
    to_location text NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    duration text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text,
    tags text[] DEFAULT ARRAY[]::text[],
    image_url text DEFAULT ''::text,
    image_alt text DEFAULT ''::text,
    is_popular boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.staff_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    privileges jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_system_role boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    sender_id uuid,
    message_content text NOT NULL,
    attachment_url text,
    is_internal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    booking_id uuid,
    subject text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    priority public.support_priority DEFAULT 'medium'::public.support_priority,
    status public.support_status DEFAULT 'open'::public.support_status,
    assigned_to uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.trip_extensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    user_id uuid,
    extra_hours integer DEFAULT 1 NOT NULL,
    excess_hourly_rate numeric DEFAULT 0 NOT NULL,
    extension_cost numeric DEFAULT 0 NOT NULL,
    payment_status text DEFAULT 'pending'::text,
    payment_method text,
    payment_reference text,
    notes text,
    requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.user_kyc (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kyc_type text DEFAULT 'customer'::text NOT NULL,
    id_type text,
    id_number text,
    id_front_url text,
    id_back_url text,
    selfie_url text,
    address_line1 text,
    address_line2 text,
    city text,
    province text,
    postal_code text,
    proof_of_address_url text,
    kyc_status text DEFAULT 'not_submitted'::text NOT NULL,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    rejection_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    category public.preference_category NOT NULL,
    preference_key text NOT NULL,
    preference_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    role public.user_role DEFAULT 'customer'::public.user_role,
    company_id uuid,
    department text,
    avatar_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    loyalty_points integer DEFAULT 0,
    membership_tier public.membership_tier DEFAULT 'bronze'::public.membership_tier,
    tier_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    points_lifetime integer DEFAULT 0,
    staff_role_id uuid,
    created_by_admin uuid,
    notes text,
    kyc_status text DEFAULT 'not_submitted'::text,
    is_suspended boolean DEFAULT false,
    username text,
    ai_flagged boolean DEFAULT false,
    ai_flag_label text,
    ai_flag_reasons text[],
    ai_flag_confidence text,
    ai_flagged_at timestamp with time zone,
    is_trusted boolean DEFAULT false,
    trusted_note text,
    account_status text DEFAULT 'approved'::text,
    account_status_note text,
    account_status_updated_at timestamp with time zone,
    account_status_updated_by uuid,
    verification_requested_at timestamp with time zone,
    CONSTRAINT user_profiles_loyalty_points_check CHECK ((loyalty_points >= 0)),
    CONSTRAINT user_profiles_points_lifetime_check CHECK ((points_lifetime >= 0))
);

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    vehicle_type public.vehicle_type NOT NULL,
    license_plate text NOT NULL,
    capacity integer NOT NULL,
    image_url text,
    description text,
    features jsonb DEFAULT '[]'::jsonb,
    status public.vehicle_status DEFAULT 'active'::public.vehicle_status,
    daily_rate numeric(10,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_setting_key_key UNIQUE (setting_key);

ALTER TABLE ONLY public.booking_approvals
    ADD CONSTRAINT booking_approvals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booking_code_key UNIQUE (booking_code);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bulk_bookings
    ADD CONSTRAINT bulk_bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_page_slug_key UNIQUE (page_slug);

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.company_employees
    ADD CONSTRAINT company_employees_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.corporate_billing_accounts
    ADD CONSTRAINT corporate_billing_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.corporate_billing_ledger
    ADD CONSTRAINT corporate_billing_ledger_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.corporate_pricing
    ADD CONSTRAINT corporate_pricing_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.corporate_statements
    ADD CONSTRAINT corporate_statements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.corporate_vehicle_assignments
    ADD CONSTRAINT corporate_vehicle_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.dispute_communications
    ADD CONSTRAINT dispute_communications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.domain_allowlist
    ADD CONSTRAINT domain_allowlist_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_applications
    ADD CONSTRAINT driver_applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_assignments
    ADD CONSTRAINT driver_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_performance
    ADD CONSTRAINT driver_performance_driver_id_trip_date_key UNIQUE (driver_id, trip_date);

ALTER TABLE ONLY public.driver_performance
    ADD CONSTRAINT driver_performance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_profiles
    ADD CONSTRAINT driver_profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_profiles
    ADD CONSTRAINT driver_profiles_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.driver_schedules
    ADD CONSTRAINT driver_schedules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_signup_requests
    ADD CONSTRAINT driver_signup_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_template_key_key UNIQUE (template_key);

ALTER TABLE ONLY public.favorite_bookings
    ADD CONSTRAINT favorite_bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guest_account_invitations
    ADD CONSTRAINT guest_account_invitations_invitation_token_key UNIQUE (invitation_token);

ALTER TABLE ONLY public.guest_account_invitations
    ADD CONSTRAINT guest_account_invitations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.membership_benefits
    ADD CONSTRAINT membership_benefits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.partner_payable_accounts
    ADD CONSTRAINT partner_payable_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.partner_payable_ledger
    ADD CONSTRAINT partner_payable_ledger_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.partner_vehicles
    ADD CONSTRAINT partner_vehicles_partner_id_vehicle_id_key UNIQUE (partner_id, vehicle_id);

ALTER TABLE ONLY public.partner_vehicles
    ADD CONSTRAINT partner_vehicles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_disputes
    ADD CONSTRAINT payment_disputes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rate_sheets
    ADD CONSTRAINT rate_sheets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_name_key UNIQUE (name);

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.trip_extensions
    ADD CONSTRAINT trip_extensions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.corporate_vehicle_assignments
    ADD CONSTRAINT unique_active_assignment EXCLUDE USING btree (company_id WITH =, vehicle_id WITH =) WHERE ((is_active = true));

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_email_key UNIQUE (email);

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_license_plate_key UNIQUE (license_plate);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);

CREATE INDEX idx_admin_audit_logs_action_type ON public.admin_audit_logs USING btree (action_type);

CREATE INDEX idx_admin_audit_logs_actor_id ON public.admin_audit_logs USING btree (actor_id);

CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs USING btree (created_at DESC);

CREATE INDEX idx_admin_audit_logs_target_type ON public.admin_audit_logs USING btree (target_type);

CREATE INDEX idx_app_settings_email ON public.app_settings USING btree (setting_key) WHERE (setting_key ~~ '%email%'::text);

CREATE INDEX idx_app_settings_key ON public.app_settings USING btree (setting_key);

CREATE INDEX idx_bookings_booking_code ON public.bookings USING btree (booking_code);

CREATE INDEX idx_bookings_cancelled ON public.bookings USING btree (cancelled_at);

CREATE INDEX idx_bookings_email_confirmation_failed_at ON public.bookings USING btree (email_confirmation_failed_at) WHERE (email_confirmation_failed_at IS NOT NULL);

CREATE INDEX idx_bookings_email_confirmation_status ON public.bookings USING btree (email_confirmation_status) WHERE (email_confirmation_status IS NOT NULL);

CREATE INDEX idx_bookings_email_notifications ON public.bookings USING btree (is_guest_booking, status, created_at) WHERE (status = 'pending'::public.booking_status);

CREATE INDEX idx_bookings_guest_email ON public.bookings USING btree (guest_email);

CREATE INDEX idx_bookings_guest_lookup ON public.bookings USING btree (is_guest_booking, guest_email, booking_code) WHERE (is_guest_booking = true);

CREATE INDEX idx_bookings_is_flagged ON public.bookings USING btree (is_flagged) WHERE (is_flagged = true);

CREATE INDEX idx_bookings_is_guest ON public.bookings USING btree (is_guest_booking);

CREATE INDEX idx_bookings_payment_method ON public.bookings USING btree (payment_method);

CREATE INDEX idx_bookings_payment_reference ON public.bookings USING btree (payment_reference);

CREATE INDEX idx_bookings_payment_status ON public.bookings USING btree (payment_status);

CREATE INDEX idx_bookings_primary_passenger_email ON public.bookings USING btree (primary_passenger_email);

CREATE INDEX idx_bookings_primary_passenger_lookup ON public.bookings USING btree (primary_passenger_email, primary_passenger_first_name, primary_passenger_last_name) WHERE (is_guest_booking = true);

CREATE INDEX idx_bookings_primary_passenger_phone ON public.bookings USING btree (primary_passenger_phone);

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);

CREATE INDEX idx_bookings_updated_by ON public.bookings USING btree (updated_by);

CREATE INDEX idx_bookings_user ON public.bookings USING btree (user_id);

CREATE INDEX idx_bookings_user_auth ON public.bookings USING btree (user_id, is_guest_booking) WHERE (is_guest_booking = false);

CREATE INDEX idx_bookings_vehicle ON public.bookings USING btree (vehicle_id);

CREATE INDEX idx_bulk_bookings_company_id ON public.bulk_bookings USING btree (company_id);

CREATE INDEX idx_bulk_bookings_created_by ON public.bulk_bookings USING btree (created_by);

CREATE INDEX idx_bulk_bookings_status ON public.bulk_bookings USING btree (status);

CREATE INDEX idx_cms_pages_published ON public.cms_pages USING btree (is_published);

CREATE INDEX idx_cms_pages_slug ON public.cms_pages USING btree (page_slug);

CREATE INDEX idx_communications_booking_id ON public.communications USING btree (booking_id);

CREATE INDEX idx_communications_conversation_id ON public.communications USING btree (conversation_id);

CREATE INDEX idx_communications_real_time ON public.communications USING btree (is_real_time, created_at);

CREATE INDEX idx_communications_recipient ON public.communications USING btree (recipient_id);

CREATE INDEX idx_communications_sender ON public.communications USING btree (sender_id);

CREATE INDEX idx_communications_status ON public.communications USING btree (message_status);

CREATE INDEX idx_communications_thread ON public.communications USING btree (message_thread);

CREATE INDEX idx_companies_created_by ON public.companies USING btree (created_by);

CREATE INDEX idx_companies_updated_by ON public.companies USING btree (updated_by);

CREATE INDEX idx_company_employees_company_id ON public.company_employees USING btree (company_id);

CREATE INDEX idx_company_employees_email ON public.company_employees USING btree (employee_email);

CREATE UNIQUE INDEX idx_corp_billing_accounts_company ON public.corporate_billing_accounts USING btree (company_id);

CREATE INDEX idx_corp_billing_ledger_account ON public.corporate_billing_ledger USING btree (billing_account_id);

CREATE INDEX idx_corp_billing_ledger_booking ON public.corporate_billing_ledger USING btree (booking_id);

CREATE INDEX idx_corp_billing_ledger_company ON public.corporate_billing_ledger USING btree (company_id);

CREATE INDEX idx_corp_pricing_active ON public.corporate_pricing USING btree (is_active);

CREATE INDEX idx_corp_pricing_company ON public.corporate_pricing USING btree (company_id);

CREATE INDEX idx_corp_pricing_vehicle_type ON public.corporate_pricing USING btree (vehicle_type);

CREATE INDEX idx_corp_statements_account ON public.corporate_statements USING btree (billing_account_id);

CREATE INDEX idx_corp_statements_company ON public.corporate_statements USING btree (company_id);

CREATE INDEX idx_corp_vehicle_assignments_active ON public.corporate_vehicle_assignments USING btree (is_active);

CREATE INDEX idx_corp_vehicle_assignments_company ON public.corporate_vehicle_assignments USING btree (company_id);

CREATE INDEX idx_corp_vehicle_assignments_vehicle ON public.corporate_vehicle_assignments USING btree (vehicle_id);

CREATE INDEX idx_dispute_communications_dispute_id ON public.dispute_communications USING btree (dispute_id);

CREATE INDEX idx_domain_allowlist_created_at ON public.domain_allowlist USING btree (created_at);

CREATE UNIQUE INDEX idx_domain_allowlist_domain ON public.domain_allowlist USING btree (lower(domain));

CREATE INDEX idx_driver_applications_email ON public.driver_applications USING btree (email);

CREATE INDEX idx_driver_applications_partner_id ON public.driver_applications USING btree (partner_id);

CREATE INDEX idx_driver_applications_status ON public.driver_applications USING btree (application_status);

CREATE INDEX idx_driver_applications_user_id ON public.driver_applications USING btree (user_id);

CREATE INDEX idx_driver_assignments_booking_id ON public.driver_assignments USING btree (booking_id);

CREATE INDEX idx_driver_assignments_driver_id ON public.driver_assignments USING btree (driver_id);

CREATE INDEX idx_driver_assignments_status ON public.driver_assignments USING btree (assignment_status);

CREATE INDEX idx_driver_performance_driver_id ON public.driver_performance USING btree (driver_id);

CREATE INDEX idx_driver_profiles_fleet_type ON public.driver_profiles USING btree (fleet_type);

CREATE INDEX idx_driver_profiles_partner_id ON public.driver_profiles USING btree (partner_id);

CREATE INDEX idx_driver_profiles_status ON public.driver_profiles USING btree (current_status);

CREATE INDEX idx_driver_profiles_user_id ON public.driver_profiles USING btree (user_id);

CREATE INDEX idx_driver_schedules_driver_id ON public.driver_schedules USING btree (driver_id);

CREATE INDEX idx_driver_schedules_partner_id ON public.driver_schedules USING btree (partner_id);

CREATE INDEX idx_driver_schedules_work_date ON public.driver_schedules USING btree (work_date);

CREATE INDEX idx_driver_signup_requests_partner_id ON public.driver_signup_requests USING btree (partner_id);

CREATE INDEX idx_driver_signup_requests_status ON public.driver_signup_requests USING btree (status);

CREATE INDEX idx_email_templates_key ON public.email_templates USING btree (template_key);

CREATE INDEX idx_favorite_bookings_created_at ON public.favorite_bookings USING btree (created_at DESC);

CREATE INDEX idx_favorite_bookings_user_id ON public.favorite_bookings USING btree (user_id);

CREATE INDEX idx_guest_invitations_email ON public.guest_account_invitations USING btree (guest_email);

CREATE INDEX idx_guest_invitations_token ON public.guest_account_invitations USING btree (invitation_token);

CREATE INDEX idx_membership_benefits_tier ON public.membership_benefits USING btree (tier);

CREATE INDEX idx_partner_payable_accounts_driver ON public.partner_payable_accounts USING btree (driver_id);

CREATE INDEX idx_partner_payable_accounts_partner ON public.partner_payable_accounts USING btree (partner_id);

CREATE INDEX idx_partner_payable_ledger_account ON public.partner_payable_ledger USING btree (payable_account_id);

CREATE INDEX idx_partner_payable_ledger_booking ON public.partner_payable_ledger USING btree (booking_id);

CREATE INDEX idx_partner_vehicles_driver_id ON public.partner_vehicles USING btree (assigned_driver_id);

CREATE INDEX idx_partner_vehicles_partner_id ON public.partner_vehicles USING btree (partner_id);

CREATE INDEX idx_partner_vehicles_vehicle_id ON public.partner_vehicles USING btree (vehicle_id);

CREATE INDEX idx_partners_created_by ON public.partners USING btree (created_by);

CREATE INDEX idx_partners_partnership_type ON public.partners USING btree (partnership_type);

CREATE INDEX idx_partners_updated_by ON public.partners USING btree (updated_by);

CREATE INDEX idx_payment_disputes_assigned_to ON public.payment_disputes USING btree (assigned_to);

CREATE INDEX idx_payment_disputes_booking_id ON public.payment_disputes USING btree (booking_id);

CREATE INDEX idx_payment_disputes_created_at ON public.payment_disputes USING btree (created_at DESC);

CREATE INDEX idx_payment_disputes_status ON public.payment_disputes USING btree (dispute_status);

CREATE INDEX idx_payment_disputes_type ON public.payment_disputes USING btree (dispute_type);

CREATE INDEX idx_points_transactions_booking_id ON public.points_transactions USING btree (booking_id);

CREATE INDEX idx_points_transactions_expires ON public.points_transactions USING btree (expires_at) WHERE (expires_at IS NOT NULL);

CREATE INDEX idx_points_transactions_type ON public.points_transactions USING btree (transaction_type);

CREATE INDEX idx_points_transactions_user_id ON public.points_transactions USING btree (user_id);

CREATE INDEX idx_rate_sheets_destination_zone ON public.rate_sheets USING btree (destination_zone);

CREATE INDEX idx_rate_sheets_is_active ON public.rate_sheets USING btree (is_active);

CREATE INDEX idx_rate_sheets_trip_category ON public.rate_sheets USING btree (trip_category);

CREATE UNIQUE INDEX idx_rate_sheets_unique ON public.rate_sheets USING btree (vehicle_type, trip_category, destination_zone);

CREATE INDEX idx_rate_sheets_vehicle_type ON public.rate_sheets USING btree (vehicle_type);

CREATE INDEX idx_routes_is_active ON public.routes USING btree (is_active);

CREATE INDEX idx_routes_is_popular ON public.routes USING btree (is_popular);

CREATE INDEX idx_staff_roles_name ON public.staff_roles USING btree (name);

CREATE INDEX idx_support_messages_sender ON public.support_messages USING btree (sender_id);

CREATE INDEX idx_support_messages_ticket_id ON public.support_messages USING btree (ticket_id);

CREATE INDEX idx_support_tickets_created ON public.support_tickets USING btree (created_at);

CREATE INDEX idx_support_tickets_priority ON public.support_tickets USING btree (priority);

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);

CREATE INDEX idx_user_kyc_status ON public.user_kyc USING btree (kyc_status);

CREATE INDEX idx_user_kyc_user_id ON public.user_kyc USING btree (user_id);

CREATE INDEX idx_user_preferences_active ON public.user_preferences USING btree (is_active);

CREATE INDEX idx_user_preferences_category ON public.user_preferences USING btree (category);

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);

CREATE INDEX idx_user_profiles_account_status ON public.user_profiles USING btree (account_status);

CREATE INDEX idx_user_profiles_ai_flagged ON public.user_profiles USING btree (ai_flagged) WHERE (ai_flagged = true);

CREATE INDEX idx_user_profiles_company ON public.user_profiles USING btree (company_id);

CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email);

CREATE INDEX idx_user_profiles_tier ON public.user_profiles USING btree (membership_tier);

CREATE UNIQUE INDEX idx_user_profiles_username ON public.user_profiles USING btree (username) WHERE (username IS NOT NULL);

CREATE INDEX idx_vehicles_status ON public.vehicles USING btree (status);

CREATE INDEX idx_vehicles_type ON public.vehicles USING btree (vehicle_type);

CREATE TRIGGER award_points_on_booking_completion AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.award_booking_points();

CREATE TRIGGER routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.update_routes_updated_at();

CREATE TRIGGER set_booking_code_trigger BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_code();

CREATE TRIGGER set_favorite_bookings_updated_at BEFORE UPDATE ON public.favorite_bookings FOR EACH ROW EXECUTE FUNCTION public.update_favorite_bookings_updated_at();

CREATE TRIGGER trg_post_trip_corporate_billing AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.post_trip_to_corporate_billing();

CREATE TRIGGER trg_post_trip_partner_payable AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.post_trip_to_partner_payable();

CREATE TRIGGER trigger_update_payment_status BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_booking_payment_status();

CREATE TRIGGER update_bulk_bookings_updated_at BEFORE UPDATE ON public.bulk_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_bulk_bookings();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_applications_updated_at BEFORE UPDATE ON public.driver_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_assignments_updated_at BEFORE UPDATE ON public.driver_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_schedules_updated_at BEFORE UPDATE ON public.driver_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_signup_requests_updated_at BEFORE UPDATE ON public.driver_signup_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_disputes_updated_at BEFORE UPDATE ON public.payment_disputes FOR EACH ROW EXECUTE FUNCTION public.update_payment_disputes_updated_at();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id);

ALTER TABLE ONLY public.booking_approvals
    ADD CONSTRAINT booking_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.booking_approvals
    ADD CONSTRAINT booking_approvals_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.booking_approvals
    ADD CONSTRAINT booking_approvals_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.booking_approvals
    ADD CONSTRAINT booking_approvals_maker_id_fkey FOREIGN KEY (maker_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);

ALTER TABLE ONLY public.bulk_bookings
    ADD CONSTRAINT bulk_bookings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bulk_bookings
    ADD CONSTRAINT bulk_bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bulk_bookings
    ADD CONSTRAINT bulk_bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.company_employees
    ADD CONSTRAINT company_employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_billing_accounts
    ADD CONSTRAINT corporate_billing_accounts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_billing_ledger
    ADD CONSTRAINT corporate_billing_ledger_billing_account_id_fkey FOREIGN KEY (billing_account_id) REFERENCES public.corporate_billing_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_billing_ledger
    ADD CONSTRAINT corporate_billing_ledger_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.corporate_billing_ledger
    ADD CONSTRAINT corporate_billing_ledger_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_billing_ledger
    ADD CONSTRAINT corporate_billing_ledger_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.corporate_pricing
    ADD CONSTRAINT corporate_pricing_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_pricing
    ADD CONSTRAINT corporate_pricing_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.corporate_statements
    ADD CONSTRAINT corporate_statements_billing_account_id_fkey FOREIGN KEY (billing_account_id) REFERENCES public.corporate_billing_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_statements
    ADD CONSTRAINT corporate_statements_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_statements
    ADD CONSTRAINT corporate_statements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.corporate_vehicle_assignments
    ADD CONSTRAINT corporate_vehicle_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.corporate_vehicle_assignments
    ADD CONSTRAINT corporate_vehicle_assignments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_vehicle_assignments
    ADD CONSTRAINT corporate_vehicle_assignments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.dispute_communications
    ADD CONSTRAINT dispute_communications_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.dispute_communications
    ADD CONSTRAINT dispute_communications_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.payment_disputes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.domain_allowlist
    ADD CONSTRAINT domain_allowlist_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_applications
    ADD CONSTRAINT driver_applications_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_applications
    ADD CONSTRAINT driver_applications_kyc_verified_by_fkey FOREIGN KEY (kyc_verified_by) REFERENCES public.user_profiles(id);

ALTER TABLE ONLY public.driver_applications
    ADD CONSTRAINT driver_applications_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_applications
    ADD CONSTRAINT driver_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_assignments
    ADD CONSTRAINT driver_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_assignments
    ADD CONSTRAINT driver_assignments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_assignments
    ADD CONSTRAINT driver_assignments_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_performance
    ADD CONSTRAINT driver_performance_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_profiles
    ADD CONSTRAINT driver_profiles_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_profiles
    ADD CONSTRAINT driver_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_profiles
    ADD CONSTRAINT driver_profiles_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_schedules
    ADD CONSTRAINT driver_schedules_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_schedules
    ADD CONSTRAINT driver_schedules_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_signup_requests
    ADD CONSTRAINT driver_signup_requests_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.driver_signup_requests
    ADD CONSTRAINT driver_signup_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.favorite_bookings
    ADD CONSTRAINT favorite_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.corporate_billing_ledger
    ADD CONSTRAINT fk_ledger_statement FOREIGN KEY (statement_id) REFERENCES public.corporate_statements(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.guest_account_invitations
    ADD CONSTRAINT guest_account_invitations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.partner_payable_accounts
    ADD CONSTRAINT partner_payable_accounts_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.partner_payable_accounts
    ADD CONSTRAINT partner_payable_accounts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.partner_payable_ledger
    ADD CONSTRAINT partner_payable_ledger_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.partner_payable_ledger
    ADD CONSTRAINT partner_payable_ledger_payable_account_id_fkey FOREIGN KEY (payable_account_id) REFERENCES public.partner_payable_accounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.partner_payable_ledger
    ADD CONSTRAINT partner_payable_ledger_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.partner_vehicles
    ADD CONSTRAINT partner_vehicles_assigned_driver_id_fkey FOREIGN KEY (assigned_driver_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.partner_vehicles
    ADD CONSTRAINT partner_vehicles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.partner_vehicles
    ADD CONSTRAINT partner_vehicles_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.partner_vehicles
    ADD CONSTRAINT partner_vehicles_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payment_disputes
    ADD CONSTRAINT payment_disputes_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payment_disputes
    ADD CONSTRAINT payment_disputes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payment_disputes
    ADD CONSTRAINT payment_disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT points_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.rate_sheets
    ADD CONSTRAINT rate_sheets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.trip_extensions
    ADD CONSTRAINT trip_extensions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.user_profiles(id);

ALTER TABLE ONLY public.trip_extensions
    ADD CONSTRAINT trip_extensions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.trip_extensions
    ADD CONSTRAINT trip_extensions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id);

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_created_by_admin_fkey FOREIGN KEY (created_by_admin) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_staff_role_id_fkey FOREIGN KEY (staff_role_id) REFERENCES public.staff_roles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
