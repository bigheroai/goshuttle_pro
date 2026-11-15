import { getPaymongoSettings, publicSettings } from '@/server/paymongo';
import { json } from '@/server/auth';

export const dynamic = 'force-dynamic';

// Public PayMongo configuration (no secret keys) for the checkout UI.
export async function GET() {
  const settings = await getPaymongoSettings();
  return json({ settings: publicSettings(settings) });
}
