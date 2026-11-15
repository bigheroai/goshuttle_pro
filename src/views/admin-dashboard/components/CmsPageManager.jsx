import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import cmsService from '../../../services/cmsService';

const PAGE_GROUPS = [
  {
    label: 'Company',
    key: 'company',
    icon: 'Building2',
    color: 'blue',
  },
  {
    label: 'Legal',
    key: 'legal',
    icon: 'Shield',
    color: 'purple',
  },
];

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
};

const slugify = (text) =>
  text?.toLowerCase()?.trim()?.replace(/[^a-z0-9\s-]/g, '')?.replace(/\s+/g, '-')?.replace(/-+/g, '-');

/**
 * Lightweight HTML sanitizer — strips <script>, <iframe>, on* event attributes,
 * and javascript: URIs to prevent XSS from admin-stored content.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  return html?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')?.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')?.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')?.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')?.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"')?.replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""');
}

const CmsPageManager = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [editForm, setEditForm] = useState({ pageTitle: '', pageContent: '', metaDescription: '', isPublished: false });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewMode, setPreviewMode] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const textareaRef = useRef(null);

  // Add Page modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ pageTitle: '', pageSlug: '', footerColumn: 'company', metaDescription: '' });
  const [addSlugManual, setAddSlugManual] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameSlug, setRenameSlug] = useState('');
  const [renameSlugManual, setRenameSlugManual] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await cmsService?.getAllPages();
      setPages(data);
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to load pages: ' + err?.message });
    } finally {
      setLoading(false);
    }
  };

  const selectPage = (page) => {
    setSelectedPage(page);
    setEditForm({
      pageTitle: page?.page_title || '',
      pageContent: page?.page_content || '',
      metaDescription: page?.meta_description || '',
      isPublished: page?.is_published || false,
    });
    setPreviewMode(false);
    setMessage({ type: '', text: '' });
    setView('editor');
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    try {
      setSaving(true);
      setMessage({ type: 'info', text: '💾 Saving...' });
      const updated = await cmsService?.updatePage(selectedPage?.id, editForm, user?.id);
      setPages(prev => prev?.map(p => p?.id === updated?.id ? updated : p));
      setSelectedPage(updated);
      setMessage({ type: 'success', text: '✅ Page saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to save: ' + err?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (page, e) => {
    e?.stopPropagation();
    try {
      setToggling(page?.id);
      const updated = await cmsService?.togglePublish(page?.id, !page?.is_published, user?.id);
      setPages(prev => prev?.map(p => p?.id === updated?.id ? updated : p));
      if (selectedPage?.id === updated?.id) {
        setSelectedPage(updated);
        setEditForm(prev => ({ ...prev, isPublished: updated?.is_published }));
      }
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to update publish status: ' + err?.message });
    } finally {
      setToggling(null);
    }
  };

  // ── Add Page ──────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setAddForm({ pageTitle: '', pageSlug: '', footerColumn: 'company', metaDescription: '' });
    setAddSlugManual(false);
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddTitleChange = (val) => {
    setAddForm(prev => ({
      ...prev,
      pageTitle: val,
      pageSlug: addSlugManual ? prev?.pageSlug : slugify(val),
    }));
  };

  const handleAddPage = async () => {
    if (!addForm?.pageTitle?.trim()) { setAddError('Page title is required.'); return; }
    if (!addForm?.pageSlug?.trim()) { setAddError('Page slug is required.'); return; }
    const slugExists = pages?.some(p => p?.page_slug === addForm?.pageSlug?.trim());
    if (slugExists) { setAddError('A page with this slug already exists.'); return; }
    try {
      setAddLoading(true);
      setAddError('');
      const newPage = await cmsService?.addPage({
        pageTitle: addForm?.pageTitle?.trim(),
        pageSlug: addForm?.pageSlug?.trim(),
        footerColumn: addForm?.footerColumn,
        metaDescription: addForm?.metaDescription?.trim(),
        userId: user?.id,
      });
      setPages(prev => [...prev, newPage]);
      setShowAddModal(false);
      setMessage({ type: 'success', text: `✅ Page "${newPage?.page_title}" created successfully.` });
    } catch (err) {
      setAddError('Failed to create page: ' + err?.message);
    } finally {
      setAddLoading(false);
    }
  };

  // ── Rename Page ───────────────────────────────────────────────────────────
  const openRenameModal = (page, e) => {
    e?.stopPropagation();
    setRenameTarget(page);
    setRenameTitle(page?.page_title || '');
    setRenameSlug(page?.page_slug || '');
    setRenameSlugManual(false);
    setRenameError('');
  };

  const handleRenameTitleChange = (val) => {
    setRenameTitle(val);
    if (!renameSlugManual) setRenameSlug(slugify(val));
  };

  const handleRenamePage = async () => {
    if (!renameTitle?.trim()) { setRenameError('Title is required.'); return; }
    if (!renameSlug?.trim()) { setRenameError('Slug is required.'); return; }
    const slugExists = pages?.some(p => p?.page_slug === renameSlug?.trim() && p?.id !== renameTarget?.id);
    if (slugExists) { setRenameError('A page with this slug already exists.'); return; }
    try {
      setRenameLoading(true);
      setRenameError('');
      const updated = await cmsService?.renamePage(renameTarget?.id, renameTitle?.trim(), renameSlug?.trim(), user?.id);
      setPages(prev => prev?.map(p => p?.id === updated?.id ? updated : p));
      if (selectedPage?.id === updated?.id) setSelectedPage(updated);
      setRenameTarget(null);
      setMessage({ type: 'success', text: `✅ Page renamed to "${updated?.page_title}".` });
    } catch (err) {
      setRenameError('Failed to rename: ' + err?.message);
    } finally {
      setRenameLoading(false);
    }
  };

  // ── Delete Page ───────────────────────────────────────────────────────────
  const openDeleteConfirm = (page, e) => {
    e?.stopPropagation();
    setDeleteTarget(page);
  };

  const handleDeletePage = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await cmsService?.deletePage(deleteTarget?.id);
      setPages(prev => prev?.filter(p => p?.id !== deleteTarget?.id));
      if (selectedPage?.id === deleteTarget?.id) { setSelectedPage(null); setView('list'); }
      setMessage({ type: 'success', text: `✅ Page "${deleteTarget?.page_title}" deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to delete: ' + err?.message });
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const insertHtmlTag = (tag, wrap = false) => {
    const textarea = textareaRef?.current;
    if (!textarea) return;
    const start = textarea?.selectionStart;
    const end = textarea?.selectionEnd;
    const selected = editForm?.pageContent?.substring(start, end);
    let insertion = '';
    if (wrap && selected) {
      insertion = `<${tag}>${selected}</${tag}>`;
    } else if (wrap) {
      insertion = `<${tag}></${tag}>`;
    } else {
      insertion = `<${tag} />`;
    }
    const newContent = editForm?.pageContent?.substring(0, start) + insertion + editForm?.pageContent?.substring(end);
    setEditForm(prev => ({ ...prev, pageContent: newContent }));
    setTimeout(() => {
      textarea?.focus();
      const newPos = start + insertion?.length;
      textarea?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const getPagesByColumn = (columnKey) => pages?.filter(p => (p?.footer_column || 'company') === columnKey);

  const publishedCount = pages?.filter(p => p?.is_published)?.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="Loader2" className="animate-spin mr-2 text-blue-500" size={20} />
        <span className="text-gray-600">Loading CMS pages...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="FileText" size={20} className="text-blue-600" />
            Content Management
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage website pages — About Us, Safety, Careers, Legal policies and more.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
            {publishedCount} of {pages?.length} Published
          </span>
          {view === 'editor' ? (
            <button
              onClick={() => { setView('list'); setMessage({ type: '', text: '' }); }}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Icon name="ArrowLeft" size={16} />
              Back to Pages
            </button>
          ) : (
            <Button onClick={openAddModal} className="flex items-center gap-2 text-sm">
              <Icon name="Plus" size={15} />
              Add Page
            </Button>
          )}
        </div>
      </div>
      {/* Message */}
      {message?.text && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          message?.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message?.type === 'error'? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <Icon
            name={message?.type === 'success' ? 'CheckCircle' : message?.type === 'error' ? 'AlertCircle' : 'Info'}
            size={16}
            className="mt-0.5 flex-shrink-0"
          />
          <p className="text-sm font-medium flex-1">{message?.text}</p>
          <button onClick={() => setMessage({ type: '', text: '' })} className="text-current opacity-60 hover:opacity-100">
            <Icon name="X" size={14} />
          </button>
        </div>
      )}
      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="space-y-6">
          {PAGE_GROUPS?.map((group) => {
            const groupPages = getPagesByColumn(group?.key);
            const colors = COLOR_MAP?.[group?.color];
            return (
              <div key={group?.label} className={`rounded-xl border ${colors?.border} overflow-hidden`}>
                <div className={`px-5 py-3 ${colors?.bg} border-b ${colors?.border} flex items-center gap-2`}>
                  <Icon name={group?.icon} size={16} className={colors?.icon} />
                  <span className={`text-sm font-semibold ${colors?.icon}`}>{group?.label}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${colors?.badge}`}>
                    {groupPages?.filter(p => p?.is_published)?.length}/{groupPages?.length} published
                  </span>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {groupPages?.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-400 italic">No pages in this column.</div>
                  ) : (
                    groupPages?.map((page) => (
                      <div
                        key={page?.id}
                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => selectPage(page)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors?.bg}`}>
                            <Icon name="FileText" size={15} className={colors?.icon} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{page?.page_title}</p>
                            <p className="text-xs text-gray-400 truncate">/{page?.page_slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          {/* Publish toggle */}
                          <button
                            onClick={(e) => handleTogglePublish(page, e)}
                            disabled={toggling === page?.id}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                              page?.is_published ? 'bg-green-500' : 'bg-gray-300'
                            } ${toggling === page?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={page?.is_published ? 'Click to unpublish' : 'Click to publish'}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              page?.is_published ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                          </button>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            page?.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {page?.is_published ? 'Published' : 'Draft'}
                          </span>
                          {/* Edit content */}
                          <button
                            onClick={(e) => { e?.stopPropagation(); selectPage(page); }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-blue-50"
                            title="Edit content"
                          >
                            <Icon name="Pencil" size={13} />
                            Edit
                          </button>
                          {/* Rename */}
                          <button
                            onClick={(e) => openRenameModal(page, e)}
                            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-amber-50"
                            title="Rename page"
                          >
                            <Icon name="Tag" size={13} />
                            Rename
                          </button>
                          {/* Delete */}
                          <button
                            onClick={(e) => openDeleteConfirm(page, e)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-red-50"
                            title="Delete page"
                          >
                            <Icon name="Trash2" size={13} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* EDITOR VIEW */}
      {view === 'editor' && selectedPage && (
        <div className="space-y-5">
          {/* Page meta */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Icon name="FileText" size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500 font-mono">/{selectedPage?.page_slug}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status:</span>
                <button
                  onClick={(e) => handleTogglePublish(selectedPage, e)}
                  disabled={toggling === selectedPage?.id}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                    editForm?.isPublished ? 'bg-green-500' : 'bg-gray-300'
                  } ${toggling === selectedPage?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    editForm?.isPublished ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  editForm?.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {editForm?.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Page Title</label>
                <Input
                  value={editForm?.pageTitle}
                  onChange={(e) => setEditForm(prev => ({ ...prev, pageTitle: e?.target?.value }))}
                  placeholder="Page title"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Meta Description</label>
                <Input
                  value={editForm?.metaDescription}
                  onChange={(e) => setEditForm(prev => ({ ...prev, metaDescription: e?.target?.value }))}
                  placeholder="SEO meta description (160 chars)"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex-wrap gap-2">
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: 'H1', tag: 'h1', wrap: true },
                  { label: 'H2', tag: 'h2', wrap: true },
                  { label: 'H3', tag: 'h3', wrap: true },
                  { label: 'P', tag: 'p', wrap: true },
                  { label: 'B', tag: 'strong', wrap: true },
                  { label: 'I', tag: 'em', wrap: true },
                  { label: 'UL', tag: 'ul', wrap: true },
                  { label: 'LI', tag: 'li', wrap: true },
                  { label: 'A', tag: 'a href=""', wrap: true },
                ]?.map((btn) => (
                  <button
                    key={btn?.label}
                    onClick={() => insertHtmlTag(btn?.tag, btn?.wrap)}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    title={`Insert <${btn?.tag}>`}
                  >
                    {btn?.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  previewMode
                    ? 'bg-blue-600 text-white border-blue-600' :'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon name={previewMode ? 'Code' : 'Eye'} size={13} />
                {previewMode ? 'Edit HTML' : 'Preview'}
              </button>
            </div>

            {/* Editor / Preview */}
            {previewMode ? (
              <div
                className="p-6 min-h-64 prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editForm?.pageContent) }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                id="cms-content-editor"
                value={editForm?.pageContent}
                onChange={(e) => setEditForm(prev => ({ ...prev, pageContent: e?.target?.value }))}
                className="w-full min-h-64 p-4 font-mono text-sm text-gray-800 bg-white border-0 focus:ring-0 focus:outline-none resize-y"
                placeholder="Enter HTML content for this page..."
                rows={18}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">
              {selectedPage?.updated_at
                ? `Last updated: ${new Date(selectedPage?.updated_at)?.toLocaleString('en-PH')}`
                : 'Not yet saved'}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setView('list'); setMessage({ type: '', text: '' }); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <><Icon name="Loader2" size={14} className="animate-spin" /> Saving...</>
                ) : (
                  <><Icon name="Save" size={14} /> Save Changes</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── ADD PAGE MODAL ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Icon name="FilePlus" size={18} className="text-blue-600" />
                Add New Page
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {addError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <Icon name="AlertCircle" size={15} />
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Page Title <span className="text-red-500">*</span></label>
                <Input
                  value={addForm?.pageTitle}
                  onChange={(e) => handleAddTitleChange(e?.target?.value)}
                  placeholder="e.g. About Us"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  URL Slug <span className="text-red-500">*</span>
                  <span className="ml-2 text-gray-400 font-normal normal-case">/pages/<strong>{addForm?.pageSlug || '...'}</strong></span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={addForm?.pageSlug}
                    onChange={(e) => { setAddSlugManual(true); setAddForm(prev => ({ ...prev, pageSlug: e?.target?.value })); }}
                    placeholder="e.g. about-us"
                    className="w-full font-mono text-sm"
                  />
                  {addSlugManual && (
                    <button
                      onClick={() => { setAddSlugManual(false); setAddForm(prev => ({ ...prev, pageSlug: slugify(prev?.pageTitle) })); }}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >Auto</button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Footer Column <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  {PAGE_GROUPS?.map(g => (
                    <button
                      key={g?.key}
                      onClick={() => setAddForm(prev => ({ ...prev, footerColumn: g?.key }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        addForm?.footerColumn === g?.key
                          ? 'border-blue-500 bg-blue-50 text-blue-700' :'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon name={g?.icon} size={15} />
                      {g?.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">This determines which footer column the page link appears in.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Meta Description</label>
                <Input
                  value={addForm?.metaDescription}
                  onChange={(e) => setAddForm(prev => ({ ...prev, metaDescription: e?.target?.value }))}
                  placeholder="Optional SEO description"
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddPage} disabled={addLoading} className="flex items-center gap-2">
                {addLoading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Creating...</> : <><Icon name="Plus" size={14} /> Create Page</>}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── RENAME MODAL ──────────────────────────────────────────────────── */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Icon name="Tag" size={18} className="text-amber-600" />
                Rename Page
              </h3>
              <button onClick={() => setRenameTarget(null)} className="text-gray-400 hover:text-gray-600">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {renameError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <Icon name="AlertCircle" size={15} />
                  {renameError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">New Title <span className="text-red-500">*</span></label>
                <Input
                  value={renameTitle}
                  onChange={(e) => handleRenameTitleChange(e?.target?.value)}
                  placeholder="Page title"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  URL Slug
                  <span className="ml-2 text-gray-400 font-normal normal-case">/pages/<strong>{renameSlug || '...'}</strong></span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={renameSlug}
                    onChange={(e) => { setRenameSlugManual(true); setRenameSlug(e?.target?.value); }}
                    placeholder="url-slug"
                    className="w-full font-mono text-sm"
                  />
                  {renameSlugManual && (
                    <button
                      onClick={() => { setRenameSlugManual(false); setRenameSlug(slugify(renameTitle)); }}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >Auto</button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
              <Button onClick={handleRenamePage} disabled={renameLoading} className="flex items-center gap-2">
                {renameLoading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Saving...</> : <><Icon name="Check" size={14} /> Save Name</>}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── DELETE CONFIRM ────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="Trash2" size={18} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Delete Page?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-gray-800">{deleteTarget?.page_title}</p>
                <p className="text-xs text-gray-400 font-mono">/pages/{deleteTarget?.page_slug}</p>
              </div>
              <p className="text-sm text-gray-600">
                Deleting this page will also remove it from the footer menu.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <button
                onClick={handleDeletePage}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deleteLoading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Deleting...</> : <><Icon name="Trash2" size={14} /> Delete Page</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmsPageManager;
