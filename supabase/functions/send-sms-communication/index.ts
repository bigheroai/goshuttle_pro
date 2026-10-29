/// <reference lib="deno.ns" />

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const TWILIO_ACCOUNT_SID = Deno?.env?.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno?.env?.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno?.env?.get('TWILIO_PHONE_NUMBER');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*'
};

Deno?.serve(async (req) => {
  // Handle CORS preflight requests
  if (req?.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { to, message, bookingId, senderId, recipientId } = await req?.json();

    if (!to || !message) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: to, message'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Create Twilio request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const formData = new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER,
      Body: message
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response?.json();

    if (!response?.ok) {
      console.error('Twilio API error:', data);
      return new Response(JSON.stringify({
        error: 'Failed to send SMS',
        details: data
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('SMS sent successfully:', data?.sid);

    // Log communication in database if booking/user info provided
    if (bookingId && senderId && recipientId) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno?.env?.get('SUPABASE_URL');
        const supabaseKey = Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          await supabase?.from('communications')?.insert({
            booking_id: bookingId,
            sender_id: senderId,
            recipient_id: recipientId,
            message_type: 'sms',
            message_content: message,
            message_status: 'delivered',
            twilio_message_sid: data?.sid,
            phone_number: to
          });
        }
      } catch (dbError) {
        console.error('Database logging failed:', dbError);
        // Don't fail the SMS send if DB logging fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      messageSid: data.sid,
      status: data.status
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});