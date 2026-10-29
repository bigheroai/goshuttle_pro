-- Add footer_column to cms_pages to track which footer section each page belongs to
ALTER TABLE public.cms_pages
  ADD COLUMN IF NOT EXISTS footer_column TEXT DEFAULT 'company' CHECK (footer_column IN ('company', 'legal'));

-- Update existing seeded pages with correct footer_column
UPDATE public.cms_pages SET footer_column = 'company'
WHERE page_slug IN ('about-us', 'safety-standards', 'careers', 'press-media');

UPDATE public.cms_pages SET footer_column = 'legal'
WHERE page_slug IN ('terms-of-service', 'privacy-policy', 'refund-policy', 'cookie-policy');
