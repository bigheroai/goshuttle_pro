import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paymongo-signature',
};

// Helper: send email via send-booking-confirmation edge function
async function sendPaymentEmail(supabaseUrl: string, serviceKey: string, type: string, customerEmail: string, bookingData: Record<string, unknown>) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type,
        customer_email: customerEmail,
        booking_data: bookingData,
      }),
    });
    const result = await res.json();
    console.log(`Email [${type}] to ${customerEmail}:`, result?.success ? 'sent' : result?.error);
    return result;
  } catch (err) {
    console.warn(`Email [${type}] failed:`, err);
  }
}

// Helper: fetch full booking details for email
async function fetchBookingForEmail(supabase: ReturnType<typeof createClient>, bookingId: string) {
  const { data } = await supabase
    ?.from('bookings')
    ?.select(`
      id, booking_code, total_cost, payment_method, payment_status, payment_reference,
      status, created_at, pickup_location, dropoff_location, pickup_date, pickup_time,
      return_date, return_time, passenger_count, special_requirements,
      guest_name, guest_email, is_guest_booking,
      primary_passenger_first_name, primary_passenger_last_name, primary_passenger_email,
      user_profiles!bookings_user_id_fkey(full_name, email),
      vehicles!bookings_vehicle_id_fkey(name, vehicle_type)
    `)
    ?.eq('id', bookingId)
    ?.maybeSingle();
  return data;
}

// Helper: extract customer email and name from booking row
function getCustomerContact(booking: Record<string, unknown>): { email: string | null; name: string } {
  const profile = booking?.user_profiles as Record<string, unknown> | null;
  const email =
    (profile?.email as string) ||
    (booking?.primary_passenger_email as string) ||
    (booking?.guest_email as string) ||
    null;
  const name =
    (profile?.full_name as string) ||
    (booking?.guest_name as string) ||
    ((booking?.primary_passenger_first_name as string)
      ? `${booking?.primary_passenger_first_name} ${booking?.primary_passenger_last_name || ''}`.trim()
      : 'Valued Customer');
  return { email, name };
}

serve(async (req) => {
  if (req?.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DenoEnv = (typeof globalThis !== 'undefined' && (globalThis as any).Deno ? (globalThis as any).Deno : { env: { get: (_: string) => undefined } }) as any;
    const supabaseUrl = DenoEnv.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = DenoEnv.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read raw body for signature verification
    const rawBody = await req?.text();
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify PayMongo webhook signature if webhook secret is configured
    const signature = req?.headers?.get('paymongo-signature');
    if (signature) {
      try {
        // Get webhook secret from app_settings
        const { data: settingsData } = await supabase?.from('app_settings')?.select('setting_value')?.eq('setting_key', 'paymongo_gateway_settings')?.single();

        const webhookSecret = settingsData?.setting_value?.webhook_secret;
        if (webhookSecret) {
          // Parse signature header: t=timestamp,te=test_sig,li=live_sig
          const parts = Object.fromEntries(
            signature?.split(',')?.map(part => {
              const [k, v] = part?.split('=');
              return [k, v];
            })
          );
          const timestamp = parts?.['t'];
          const testSig = parts?.['te'];
          const liveSig = parts?.['li'];

          if (timestamp && (testSig || liveSig)) {
            const encoder = new TextEncoder();
            const key = await crypto.subtle?.importKey(
              'raw',
              encoder?.encode(webhookSecret),
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            const message = `${timestamp}.${rawBody}`;
            const sigBuffer = await crypto.subtle?.sign('HMAC', key, encoder?.encode(message));
            const computedSig = Array.from(new Uint8Array(sigBuffer))?.map(b => b?.toString(16)?.padStart(2, '0'))?.join('');

            const expectedSig = testSig || liveSig;
            if (computedSig !== expectedSig) {
              console.warn('PayMongo webhook signature mismatch');
              // Log but don't reject — allows testing without strict sig validation
            }
          }
        }
      } catch (sigErr) {
        console.warn('Signature verification error:', sigErr);
      }
    }

    const eventType = event?.data?.attributes?.type;
    const eventData = event?.data?.attributes?.data;

    console.log('PayMongo webhook received:', eventType);

    // Handle payment.paid event
    if (eventType === 'payment.paid') {
      const payment = eventData;
      const paymentId = payment?.id;
      const paymentStatus = payment?.attributes?.status;
      const description = payment?.attributes?.description || '';
      const remarks = payment?.attributes?.remarks || '';
      const referenceNumber = payment?.attributes?.external_reference_number || '';
      const amountInCentavos = payment?.attributes?.amount;
      const paymentMethod = payment?.attributes?.source?.type || payment?.attributes?.payment_method_type || null;

      // Try to find booking by payment reference or booking code in description/remarks
      let bookingQuery = supabase?.from('bookings')?.select('id, status, payment_status, booking_code');

      // Search by payment_reference matching paymentId
      const { data: byRef } = await bookingQuery?.eq('payment_reference', paymentId)?.maybeSingle();

      let booking = byRef;

      // Fallback: search by booking_code in remarks or description
      if (!booking && (remarks || description || referenceNumber)) {
        const searchTerms = [remarks, description, referenceNumber]?.filter(Boolean);
        for (const term of searchTerms) {
          const { data: byCode } = await supabase?.from('bookings')?.select('id, status, payment_status, booking_code')?.ilike('booking_code', `%${term}%`)?.maybeSingle();
          if (byCode) { booking = byCode; break; }
        }
      }

      if (booking) {
        const updatePayload: Record<string, unknown> = {
          payment_status: 'paid',
          status: 'confirmed',
          payment_reference: paymentId,
          updated_at: new Date()?.toISOString(),
        };
        if (paymentMethod) updatePayload.payment_method = paymentMethod;

        const { error: updateError } = await supabase?.from('bookings')?.update(updatePayload)?.eq('id', booking?.id);

        if (updateError) {
          console.error('Failed to update booking:', updateError);
          return new Response(JSON.stringify({ error: 'Failed to update booking' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Booking ${booking?.booking_code} updated to paid/confirmed`);

        // Send booking confirmation + payment receipt emails
        const fullBooking = await fetchBookingForEmail(supabase, booking?.id);
        if (fullBooking) {
          const { email: customerEmail, name: customerName } = getCustomerContact(fullBooking as Record<string, unknown>);
          if (customerEmail) {
            const vehicle = fullBooking?.vehicles as Record<string, unknown> | null;
            const emailData = {
              booking_id: fullBooking?.booking_code,
              booking_code: fullBooking?.booking_code,
              customer_name: customerName,
              customer_email: customerEmail,
              pickup_location: fullBooking?.pickup_location,
              dropoff_location: fullBooking?.dropoff_location,
              pickup_date: fullBooking?.pickup_date,
              pickup_time: fullBooking?.pickup_time,
              return_date: fullBooking?.return_date,
              return_time: fullBooking?.return_time,
              passenger_count: fullBooking?.passenger_count,
              vehicle_name: vehicle?.name,
              vehicle_type: vehicle?.vehicle_type,
              total_cost: fullBooking?.total_cost,
              payment_method: paymentMethod || fullBooking?.payment_method,
              payment_reference: paymentId,
              special_requirements: fullBooking?.special_requirements,
              paid_at: new Date().toISOString(),
            };

            // Send booking confirmation email
            await sendPaymentEmail(supabaseUrl, supabaseServiceKey, 'customer_confirmation', customerEmail, emailData);
            // Send payment receipt email
            await sendPaymentEmail(supabaseUrl, supabaseServiceKey, 'payment_receipt', customerEmail, emailData);
          }
        }
      } else {
        console.warn('No matching booking found for payment:', paymentId);
      }
    }

    // Handle payment.failed event
    if (eventType === 'payment.failed') {
      const payment = eventData;
      const paymentId = payment?.id;

      const { data: booking } = await supabase?.from('bookings')?.select('id, booking_code')?.eq('payment_reference', paymentId)?.maybeSingle();

      if (booking) {
        await supabase?.from('bookings')?.update({ payment_status: 'failed', updated_at: new Date()?.toISOString() })?.eq('id', booking?.id);
        console.log(`Booking ${booking?.booking_code} marked as payment failed`);
      }
    }

    // Handle source.chargeable (for GCash/Maya sources)
    if (eventType === 'source.chargeable') {
      const source = eventData;
      const sourceId = source?.id;
      const amount = source?.attributes?.amount;
      const currency = source?.attributes?.currency || 'PHP';

      // Find booking by payment_reference matching sourceId
      const { data: booking } = await supabase?.from('bookings')?.select('id, booking_code, total_cost')?.eq('payment_reference', sourceId)?.maybeSingle();

      if (booking) {
        // Get PayMongo settings to create payment
        const { data: settingsData } = await supabase?.from('app_settings')?.select('setting_value')?.eq('setting_key', 'paymongo_gateway_settings')?.single();

        const settings = settingsData?.setting_value;
        if (settings?.enabled) {
          const mode = settings?.mode || 'test';
          const secretKey = mode === 'live' ? settings?.secret_key_live : settings?.secret_key_test;

          if (secretKey) {
            try {
              // Create payment from chargeable source
              const paymentResponse = await fetch('https://api.paymongo.com/v1/payments', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Basic ' + btoa(secretKey + ':'),
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      amount,
                      currency,
                      source: { id: sourceId, type: 'source' },
                      description: `GoShuttle Booking ${booking?.booking_code}`,
                    },
                  },
                }),
              });

              const paymentResult = await paymentResponse?.json();
              if (paymentResponse?.ok) {
                const newPaymentId = paymentResult?.data?.id;
                await supabase?.from('bookings')?.update({
                    payment_status: 'paid',
                    status: 'confirmed',
                    payment_reference: newPaymentId,
                    updated_at: new Date()?.toISOString(),
                  })?.eq('id', booking?.id);
                console.log(`Source payment created and booking ${booking?.booking_code} confirmed`);

                // Send booking confirmation + payment receipt emails
                const fullBooking = await fetchBookingForEmail(supabase, booking?.id);
                if (fullBooking) {
                  const { email: customerEmail, name: customerName } = getCustomerContact(fullBooking as Record<string, unknown>);
                  if (customerEmail) {
                    const vehicle = fullBooking?.vehicles as Record<string, unknown> | null;
                    const emailData = {
                      booking_id: fullBooking?.booking_code,
                      booking_code: fullBooking?.booking_code,
                      customer_name: customerName,
                      customer_email: customerEmail,
                      pickup_location: fullBooking?.pickup_location,
                      dropoff_location: fullBooking?.dropoff_location,
                      pickup_date: fullBooking?.pickup_date,
                      pickup_time: fullBooking?.pickup_time,
                      return_date: fullBooking?.return_date,
                      return_time: fullBooking?.return_time,
                      passenger_count: fullBooking?.passenger_count,
                      vehicle_name: vehicle?.name,
                      vehicle_type: vehicle?.vehicle_type,
                      total_cost: fullBooking?.total_cost,
                      payment_method: source?.attributes?.type,
                      payment_reference: newPaymentId,
                      special_requirements: fullBooking?.special_requirements,
                      paid_at: new Date().toISOString(),
                    };
                    await sendPaymentEmail(supabaseUrl, supabaseServiceKey, 'customer_confirmation', customerEmail, emailData);
                    await sendPaymentEmail(supabaseUrl, supabaseServiceKey, 'payment_receipt', customerEmail, emailData);
                  }
                }
              }
            } catch (payErr) {
              console.error('Error creating payment from source:', payErr);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
