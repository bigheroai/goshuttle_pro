-- CMS Pages Table for managing static content pages
-- Pages: About Us, Safety Standards, Careers, Press & Media,
--        Terms of Service, Privacy Policy, Refund Policy, Cookie Policy

CREATE TABLE IF NOT EXISTS public.cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_slug TEXT NOT NULL UNIQUE,
    page_title TEXT NOT NULL,
    page_content TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON public.cms_pages(page_slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_published ON public.cms_pages(is_published);

-- Enable RLS
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
DROP POLICY IF EXISTS "public_read_published_cms_pages" ON public.cms_pages;
CREATE POLICY "public_read_published_cms_pages"
ON public.cms_pages
FOR SELECT
TO public
USING (is_published = true);

-- Admins can read all pages (including drafts)
DROP POLICY IF EXISTS "admin_read_all_cms_pages" ON public.cms_pages;
CREATE POLICY "admin_read_all_cms_pages"
ON public.cms_pages
FOR SELECT
TO authenticated
USING (public.is_admin_from_auth());

-- Admins can insert pages
DROP POLICY IF EXISTS "admin_insert_cms_pages" ON public.cms_pages;
CREATE POLICY "admin_insert_cms_pages"
ON public.cms_pages
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_from_auth());

-- Admins can update pages
DROP POLICY IF EXISTS "admin_update_cms_pages" ON public.cms_pages;
CREATE POLICY "admin_update_cms_pages"
ON public.cms_pages
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Admins can delete pages
DROP POLICY IF EXISTS "admin_delete_cms_pages" ON public.cms_pages;
CREATE POLICY "admin_delete_cms_pages"
ON public.cms_pages
FOR DELETE
TO authenticated
USING (public.is_admin_from_auth());

-- Seed default CMS pages (drafts by default)
DO $$
BEGIN
    INSERT INTO public.cms_pages (page_slug, page_title, page_content, meta_description, is_published)
    VALUES
        ('about-us', 'About Us',
         '<h1>About GoShuttle</h1><p>GoShuttle is a premium shuttle and van booking platform delivering seamless, technology-driven ground transportation with real-time tracking and professional service across the Philippines.</p><h2>Our Mission</h2><p>To provide safe, reliable, and affordable transportation solutions for every Filipino.</p><h2>Our Vision</h2><p>To become the leading ground transportation platform in Southeast Asia.</p>',
         'Learn about GoShuttle - our mission, vision, and the team behind the Philippines'' leading shuttle booking platform.',
         true),
        ('safety-standards', 'Safety Standards',
         '<h1>Safety Standards</h1><p>At GoShuttle, safety is our top priority. All our vehicles and drivers undergo rigorous screening and regular inspections to ensure your safety on every trip.</p><h2>Driver Verification</h2><p>All drivers are background-checked, licensed, and trained in defensive driving and customer service.</p><h2>Vehicle Standards</h2><p>Our fleet is regularly inspected and maintained to meet the highest safety standards set by LTFRB and DOTr.</p>',
         'GoShuttle safety standards - how we ensure every trip is safe, reliable, and comfortable for all passengers.',
         true),
        ('careers', 'Careers',
         '<h1>Careers at GoShuttle</h1><p>Join our growing team and help shape the future of transportation in the Philippines.</p><h2>Open Positions</h2><p>We are always looking for talented individuals to join our team. Check back regularly for new opportunities.</p><h2>Why GoShuttle?</h2><p>Competitive compensation, flexible work arrangements, and the opportunity to make a real impact.</p>',
         'Explore career opportunities at GoShuttle. Join our team and help transform ground transportation in the Philippines.',
         true),
        ('press-media', 'Press & Media',
         '<h1>Press & Media</h1><p>For press inquiries, media partnerships, and official statements, please contact our communications team.</p><h2>Media Contact</h2><p>Email: press@goshuttle.ph</p><p>Phone: +63 2 8123 4567</p><h2>Press Kit</h2><p>Download our official press kit including logos, brand guidelines, and company information.</p>',
         'GoShuttle press and media resources. Contact our communications team for press inquiries and media partnerships.',
         true),
        ('terms-of-service', 'Terms of Service',
         '<h1>Terms of Service</h1><p>Last updated: January 1, 2025</p><p>By using GoShuttle services, you agree to these terms and conditions.</p><h2>1. Acceptance of Terms</h2><p>By accessing or using our platform, you agree to be bound by these Terms of Service.</p><h2>2. Use of Services</h2><p>You may use our services only for lawful purposes and in accordance with these terms.</p><h2>3. Booking and Cancellation</h2><p>Bookings are subject to availability. Cancellation policies apply as stated at the time of booking.</p>',
         'GoShuttle Terms of Service - the rules and guidelines governing your use of our platform and transportation services.',
         true),
        ('privacy-policy', 'Privacy Policy',
         '<h1>Privacy Policy</h1><p>Last updated: January 1, 2025</p><p>GoShuttle is committed to protecting your personal information.</p><h2>Information We Collect</h2><p>We collect information you provide directly to us, such as when you create an account or make a booking.</p><h2>How We Use Your Information</h2><p>We use your information to provide, maintain, and improve our services.</p><h2>Data Security</h2><p>We implement appropriate security measures to protect your personal information.</p>',
         'GoShuttle Privacy Policy - how we collect, use, and protect your personal information.',
         true),
        ('refund-policy', 'Refund Policy',
         '<h1>Refund Policy</h1><p>Last updated: January 1, 2025</p><h2>Cancellation and Refunds</h2><p>Our refund policy is based on how far in advance you cancel your booking:</p><ul><li>More than 24 hours before pickup: Full refund</li><li>12-24 hours before pickup: 80% refund</li><li>6-12 hours before pickup: 50% refund</li><li>Less than 6 hours before pickup: No refund</li></ul><h2>Processing Time</h2><p>Refunds are processed within 5-7 business days.</p>',
         'GoShuttle Refund Policy - understand our cancellation and refund terms for shuttle bookings.',
         true),
        ('cookie-policy', 'Cookie Policy',
         '<h1>Cookie Policy</h1><p>Last updated: January 1, 2025</p><p>GoShuttle uses cookies to enhance your browsing experience.</p><h2>What Are Cookies?</h2><p>Cookies are small text files stored on your device when you visit our website.</p><h2>How We Use Cookies</h2><p>We use cookies to remember your preferences, analyze site traffic, and improve our services.</p><h2>Managing Cookies</h2><p>You can control cookies through your browser settings. Disabling cookies may affect some features of our platform.</p>',
         'GoShuttle Cookie Policy - how we use cookies and similar technologies on our platform.',
         true)
    ON CONFLICT (page_slug) DO NOTHING;
END $$;
