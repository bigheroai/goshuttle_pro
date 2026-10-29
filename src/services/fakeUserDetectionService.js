import { getChatCompletion } from './aiIntegrations/chatCompletion';
import { supabase } from '../lib/supabase';

/**
 * Fetch allowed domains from the database allowlist.
 * Falls back to an empty array on error.
 */
async function getAllowedDomains() {
  try {
    const { data, error } = await supabase?.from('domain_allowlist')?.select('domain');
    if (error || !data) return [];
    return data?.map(d => d?.domain?.toLowerCase());
  } catch {
    return [];
  }
}

/**
 * Check if a user is marked as trusted (should be skipped by AI scanner).
 */
export async function isUserTrusted(userId) {
  if (!userId) return false;
  try {
    const { data } = await supabase?.from('user_profiles')?.select('is_trusted')?.eq('id', userId)?.single();
    return data?.is_trusted === true;
  } catch {
    return false;
  }
}

/**
 * Analyzes a user's name, username, and email for signs of being fake/suspicious.
 * Returns { isSuspicious, confidence, reasons, flagLabel }
 * Skips trusted users and respects the domain allowlist.
 */
export async function detectFakeUser({ full_name, username, email, userId }) {
  // Skip trusted users entirely
  if (userId) {
    const trusted = await isUserTrusted(userId);
    if (trusted) {
      return { isSuspicious: false, confidence: 'low', reasons: ['Trusted account — skipped by AI scanner'], flagLabel: 'Clean' };
    }
  }

  // Fetch allowed domains from DB
  const allowedDomains = await getAllowedDomains();
  const allowedDomainList = allowedDomains?.length > 0
    ? allowedDomains?.join(', ')
    : 'gmail.com, yahoo.com, outlook.com, hotmail.com, icloud.com, live.com, msn.com, aol.com, protonmail.com, zoho.com, yandex.com, mail.com';

  const prompt = `You are a fraud detection system for a transportation booking platform. Analyze the following user registration data and determine if it looks like a fake, bot, or suspicious account.

User data:
- Full Name: ${full_name || '(not provided)'}
- Username: ${username || '(not provided)'}
- Email: ${email || '(not provided)'}

Rules for suspicious detection:
1. EMAIL VALIDATION — A valid email includes ANY of these:
   - Explicitly allowed domains (ALWAYS treat as legitimate): ${allowedDomainList}
   - Business/company domains: ANY custom domain that looks like a real business (e.g., company.com, company.ph, company.net, company.org, goshuttle.ph, acme.co, startup.io, etc.). Business domains are ALWAYS considered legitimate regardless of whether you recognize the specific company name.
   - Country-code domains (.ph, .uk, .au, .ca, .de, .fr, .sg, .id, etc.) are valid.
   - Only flag emails that use known DISPOSABLE/TEMPORARY email services: mailinator.com, tempmail.com, guerrillamail.com, 10minutemail.com, throwam.com, yopmail.com, trashmail.com, fakeinbox.com, sharklasers.com, dispostable.com, and similar throwaway services.
   - Only flag emails where the LOCAL PART (before @) is clearly random gibberish like "xkqzjwp" or "a7f3k9m2" with no recognizable words — but do NOT flag short usernames, initials, or names with numbers (e.g., john.doe123, jsmith, admin, info, support are all fine).
   - NEVER flag an email solely because you don't recognize the domain. Unknown domains are assumed to be legitimate business domains.
2. Full name should look like a real human name. Flag names that are: all random characters, keyboard mashing (asdfgh, qwerty), repeated characters, numbers mixed in, or clearly fake (e.g., "Test User", "aaa bbb", "123 456").
3. Username should not be random gibberish, all numbers, or clearly auto-generated bot patterns.
4. Consider combinations: a suspicious email + suspicious name = high confidence fake. A legitimate business email alone is NEVER sufficient reason to flag a user.

Respond ONLY with valid JSON in this exact format:
{
  "isSuspicious": true or false,
  "confidence": "low" | "medium" | "high",
  "reasons": ["reason 1", "reason 2"],
  "flagLabel": "Suspicious Account" | "Possible Bot" | "Invalid Email" | "Fake Name" | "Clean"
}`;

  try {
    const result = await getChatCompletion(
      'OPEN_AI',
      'gpt-4o-mini',
      [
        { role: 'system', content: 'You are a fraud detection AI. Always respond with valid JSON only, no markdown, no explanation.' },
        { role: 'user', content: prompt }
      ],
      { max_completion_tokens: 300, temperature: 0 }
    );

    // Extract content from response
    const content = result?.choices?.[0]?.message?.content || '';
    const cleaned = content?.replace(/```json\n?/g, '')?.replace(/```\n?/g, '')?.trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.warn('Fake user detection failed (non-blocking):', err?.message);
    return { isSuspicious: false, confidence: 'low', reasons: [], flagLabel: 'Clean' };
  }
}

/**
 * Scans existing users in bulk and returns detection results.
 * Processes in small batches to avoid rate limits.
 * Automatically skips trusted users.
 */
export async function scanUsersForFakeAccounts(users) {
  const results = {};
  const batchSize = 5;

  for (let i = 0; i < users?.length; i += batchSize) {
    const batch = users?.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch?.map(async (user) => {
        const detection = await detectFakeUser({
          full_name: user?.full_name,
          username: user?.username,
          email: user?.email,
          userId: user?.id,
        });
        return { id: user?.id, detection };
      })
    );

    batchResults?.forEach((res) => {
      if (res?.status === 'fulfilled') {
        results[res.value.id] = res?.value?.detection;
      }
    });

    // Small delay between batches
    if (i + batchSize < users?.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}
