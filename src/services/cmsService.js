import { supabase } from '../lib/supabase';

const cmsService = {
  async getAllPages() {
    const { data, error } = await supabase?.from('cms_pages')?.select('*')?.order('page_title', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getPageBySlug(slug) {
    const { data, error } = await supabase?.from('cms_pages')?.select('*')?.eq('page_slug', slug)?.maybeSingle();
    if (error) throw error;
    return data;
  },

  async updatePage(id, updates, userId) {
    const { data, error } = await supabase?.from('cms_pages')?.update({
        page_title: updates?.pageTitle,
        page_content: updates?.pageContent,
        meta_description: updates?.metaDescription,
        is_published: updates?.isPublished,
        updated_at: new Date()?.toISOString(),
        updated_by: userId,
      })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async togglePublish(id, isPublished, userId) {
    const { data, error } = await supabase?.from('cms_pages')?.update({
        is_published: isPublished,
        updated_at: new Date()?.toISOString(),
        updated_by: userId,
      })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async addPage({ pageTitle, pageSlug, footerColumn, metaDescription, userId }) {
    const { data, error } = await supabase?.from('cms_pages')?.insert({
      page_title: pageTitle,
      page_slug: pageSlug,
      footer_column: footerColumn,
      meta_description: metaDescription || '',
      page_content: '',
      is_published: false,
      created_at: new Date()?.toISOString(),
      updated_at: new Date()?.toISOString(),
      updated_by: userId,
    })?.select()?.single();
    if (error) throw error;
    return data;
  },

  async deletePage(id) {
    const { error } = await supabase?.from('cms_pages')?.delete()?.eq('id', id);
    if (error) throw error;
  },

  async renamePage(id, newTitle, newSlug, userId) {
    const { data, error } = await supabase?.from('cms_pages')?.update({
      page_title: newTitle,
      page_slug: newSlug,
      updated_at: new Date()?.toISOString(),
      updated_by: userId,
    })?.eq('id', id)?.select()?.single();
    if (error) throw error;
    return data;
  },

  async getPublishedPagesByColumn(column) {
    const { data, error } = await supabase
      ?.from('cms_pages')
      ?.select('page_title, page_slug')
      ?.eq('footer_column', column)
      ?.eq('is_published', true)
      ?.order('page_title', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAllPublishedPagesGrouped() {
    const { data, error } = await supabase
      ?.from('cms_pages')
      ?.select('page_title, page_slug, footer_column')
      ?.eq('is_published', true)
      ?.order('page_title', { ascending: true });
    if (error) throw error;
    const grouped = {};
    (data || [])?.forEach(page => {
      const col = page?.footer_column || 'company';
      if (!grouped?.[col]) grouped[col] = [];
      grouped?.[col]?.push({ name: page?.page_title, path: `/pages/${page?.page_slug}` });
    });
    return grouped;
  },
};

export default cmsService;
