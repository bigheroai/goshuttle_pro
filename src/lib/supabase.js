/*
 * Browser data client for GoShuttle Pro.
 *
 * The app used to talk to Supabase directly from the browser. Data now lives in
 * Netlify Database and sign-in uses Netlify Identity, so this module keeps the
 * same `supabase.from(...)`, `supabase.rpc(...)`, `supabase.auth.*` and
 * `supabase.storage.*` calls working by sending them to the app's own server
 * routes (/api/db, /api/storage, /api/auth). The server checks who is signed in
 * and what their role allows before touching any data.
 */
import {
  login,
  logout,
  signup,
  getUser as getIdentityUser,
  updateUser as updateIdentityUser,
  requestPasswordRecovery,
  refreshSession as refreshIdentitySession,
  handleAuthCallback,
  onAuthChange,
  AUTH_EVENTS,
  AuthError,
  MissingIdentityError,
} from '@netlify/identity';

const isBrowser = typeof window !== 'undefined';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCookie(name) {
  if (!isBrowser) return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function accessToken() {
  return readCookie('nf_jwt');
}

function authHeaders(extra = {}) {
  const token = accessToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

function makeError(message, extra = {}) {
  return { message, code: extra.code || null, details: extra.details || null, hint: extra.hint || null, status: extra.status };
}

async function postJson(url, body, signal) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload?.error) {
      return {
        data: null,
        count: null,
        error: makeError(payload?.error?.message || `Request failed (${res.status})`, { ...payload?.error, status: res.status }),
        status: res.status,
        statusText: res.statusText,
      };
    }
    return { data: payload.data ?? null, count: payload.count ?? null, error: null, status: res.status, statusText: res.statusText };
  } catch (err) {
    return { data: null, count: null, error: makeError(err?.message || 'Network error'), status: 0, statusText: '' };
  }
}

// ---------------------------------------------------------------------------
// Query builder (subset of the PostgREST builder the app uses)
// ---------------------------------------------------------------------------

class QueryBuilder {
  constructor(table) {
    this.spec = { table, action: 'select', select: '*', filters: [], order: [] };
    this._throw = false;
    this._signal = undefined;
  }

  // --- actions ---
  select(columns = '*', options = {}) {
    if (this.spec.action === 'select') {
      this.spec.select = columns;
      if (options.count) this.spec.count = options.count;
      if (options.head) this.spec.head = true;
    } else {
      this.spec.returning = true;
      this.spec.select = columns;
    }
    return this;
  }
  insert(values, options = {}) {
    this.spec.action = 'insert';
    this.spec.values = values;
    if (options.count) this.spec.count = options.count;
    return this;
  }
  upsert(values, options = {}) {
    this.spec.action = 'upsert';
    this.spec.values = values;
    if (options.onConflict) this.spec.onConflict = options.onConflict;
    if (options.ignoreDuplicates) this.spec.ignoreDuplicates = true;
    if (options.count) this.spec.count = options.count;
    return this;
  }
  update(values, options = {}) {
    this.spec.action = 'update';
    this.spec.values = values;
    if (options.count) this.spec.count = options.count;
    return this;
  }
  delete(options = {}) {
    this.spec.action = 'delete';
    if (options.count) this.spec.count = options.count;
    return this;
  }

  // --- filters ---
  _f(column, op, value, negate = false) {
    this.spec.filters.push({ column, op, value: value === undefined ? null : value, negate });
    return this;
  }
  eq(c, v) { return this._f(c, 'eq', v); }
  neq(c, v) { return this._f(c, 'neq', v); }
  gt(c, v) { return this._f(c, 'gt', v); }
  gte(c, v) { return this._f(c, 'gte', v); }
  lt(c, v) { return this._f(c, 'lt', v); }
  lte(c, v) { return this._f(c, 'lte', v); }
  like(c, v) { return this._f(c, 'like', v); }
  ilike(c, v) { return this._f(c, 'ilike', v); }
  is(c, v) { return this._f(c, 'is', v); }
  in(c, v) { return this._f(c, 'in', Array.isArray(v) ? v : [v]); }
  contains(c, v) { return this._f(c, 'contains', v); }
  containedBy(c, v) { return this._f(c, 'containedBy', v); }
  overlaps(c, v) { return this._f(c, 'overlaps', v); }
  match(obj) {
    Object.entries(obj || {}).forEach(([c, v]) => this._f(c, 'eq', v));
    return this;
  }
  not(c, op, v) { return this._f(c, op, v, true); }
  filter(c, op, v) {
    if (String(op).startsWith('not.')) return this._f(c, String(op).slice(4), v, true);
    return this._f(c, op, v);
  }
  or(expression, options = {}) {
    this.spec.filters.push({ type: 'or', expression, foreignTable: options.foreignTable || options.referencedTable });
    return this;
  }

  // --- modifiers ---
  order(column, options = {}) {
    this.spec.order.push({
      column,
      ascending: options.ascending !== false,
      nullsFirst: options.nullsFirst,
      foreignTable: options.foreignTable || options.referencedTable,
    });
    return this;
  }
  limit(n, options = {}) {
    if (!(options.foreignTable || options.referencedTable)) this.spec.limit = n;
    return this;
  }
  range(from, to) {
    this.spec.offset = from;
    this.spec.limit = to - from + 1;
    return this;
  }
  single() {
    this.spec.single = 'single';
    return this;
  }
  maybeSingle() {
    this.spec.single = 'maybe';
    return this;
  }
  abortSignal(signal) {
    this._signal = signal;
    return this;
  }
  throwOnError() {
    this._throw = true;
    return this;
  }
  returns() {
    return this;
  }

  async _execute() {
    const result = await postJson('/api/db/query', this.spec, this._signal);
    if (this._throw && result.error) throw result.error;
    return result;
  }
  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
  catch(reject) {
    return this._execute().catch(reject);
  }
  finally(fn) {
    return this._execute().finally(fn);
  }
}

class RpcBuilder {
  constructor(fn, args) {
    this.fn = fn;
    this.args = args || {};
    this._single = null;
  }
  single() {
    this._single = 'single';
    return this;
  }
  maybeSingle() {
    this._single = 'maybe';
    return this;
  }
  select() {
    return this;
  }
  async _execute() {
    const result = await postJson('/api/db/rpc', { fn: this.fn, args: this.args });
    if (this._single && Array.isArray(result.data)) {
      result.data = result.data[0] ?? null;
    }
    return result;
  }
  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
  catch(reject) {
    return this._execute().catch(reject);
  }
}

// ---------------------------------------------------------------------------
// Auth (Netlify Identity behind Supabase-shaped methods)
// ---------------------------------------------------------------------------

let profileCache = { token: null, value: null };

/** Asks the server for the caller's profile id/role (links imported profiles on first sign-in). */
async function loadServerProfile(force = false) {
  const token = accessToken();
  if (!token) return null;
  if (!force && profileCache.token === token && profileCache.value) return profileCache.value;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin', headers: authHeaders() });
    if (!res.ok) return null;
    const value = await res.json();
    profileCache = { token, value };
    return value;
  } catch {
    return null;
  }
}

function toAppUser(identityUser, server) {
  if (!identityUser) return null;
  const meta = identityUser.userMetadata || {};
  const role = server?.role || meta.role || 'customer';
  return {
    id: server?.user?.id || identityUser.id,
    identity_id: identityUser.id,
    email: identityUser.email,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: identityUser.createdAt,
    updated_at: identityUser.updatedAt,
    email_confirmed_at: identityUser.confirmedAt || null,
    confirmed_at: identityUser.confirmedAt || null,
    last_sign_in_at: identityUser.lastSignInAt || null,
    user_metadata: { ...meta, full_name: meta.full_name || identityUser.name, role },
    app_metadata: { ...(identityUser.appMetadata || {}), role },
    identities: [{ provider: identityUser.provider || 'email' }],
  };
}

async function currentSession(forceProfile = false) {
  const identityUser = await getIdentityUser();
  if (!identityUser) return null;
  const server = await loadServerProfile(forceProfile);
  const user = toAppUser(identityUser, server);
  const token = accessToken();
  return { access_token: token, token_type: 'bearer', user, refresh_token: readCookie('nf_refresh') };
}

function friendlyAuthError(error) {
  if (error instanceof MissingIdentityError) return makeError('Sign-in is not available yet: Netlify Identity is not enabled for this site.');
  if (error instanceof AuthError) {
    const msg = String(error.message || '');
    if (error.status === 401 || /invalid_grant|No user found|Invalid Password/i.test(msg)) {
      if (/confirm/i.test(msg)) return makeError('Email not confirmed', { status: error.status });
      return makeError('Invalid login credentials', { status: error.status });
    }
    if (/already registered|already exists/i.test(msg)) return makeError('User already registered', { status: error.status });
    return makeError(msg || 'Authentication failed', { status: error.status });
  }
  return makeError(error?.message || 'Authentication failed');
}

const listeners = new Set();
function emit(event, session) {
  listeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch (err) {
      console.error('Auth listener failed:', err);
    }
  });
}

if (isBrowser) {
  onAuthChange(async (event) => {
    const map = {
      [AUTH_EVENTS.LOGIN]: 'SIGNED_IN',
      [AUTH_EVENTS.LOGOUT]: 'SIGNED_OUT',
      [AUTH_EVENTS.TOKEN_REFRESH]: 'TOKEN_REFRESHED',
      [AUTH_EVENTS.USER_UPDATED]: 'USER_UPDATED',
      [AUTH_EVENTS.RECOVERY]: 'PASSWORD_RECOVERY',
    };
    const name = map[event];
    if (!name) return;
    if (name === 'SIGNED_OUT') {
      profileCache = { token: null, value: null };
      emit(name, null);
      return;
    }
    emit(name, await currentSession(name === 'SIGNED_IN'));
  });

  // Process confirmation / recovery / invite links (#confirmation_token=... etc.)
  if (/(confirmation|recovery|invite|email_change)_token=|access_token=/.test(window.location.hash)) {
    handleAuthCallback()
      .then((result) => {
        if (result?.type === 'recovery' && !window.location.pathname.startsWith('/auth/reset-password')) {
          window.location.replace('/auth/reset-password?recovery=1');
        }
      })
      .catch((err) => console.error('Could not complete the sign-in link:', err?.message || err));
  }
}

const auth = {
  async getSession() {
    try {
      return { data: { session: await currentSession() }, error: null };
    } catch (err) {
      return { data: { session: null }, error: makeError(err?.message) };
    }
  },
  async getUser() {
    try {
      const session = await currentSession();
      return session ? { data: { user: session.user }, error: null } : { data: { user: null }, error: makeError('Auth session missing!') };
    } catch (err) {
      return { data: { user: null }, error: makeError(err?.message) };
    }
  },
  async signInWithPassword({ email, password }) {
    try {
      await login(String(email || '').trim(), password);
      const session = await currentSession(true);
      return { data: { user: session?.user || null, session }, error: null };
    } catch (err) {
      return { data: { user: null, session: null }, error: friendlyAuthError(err) };
    }
  },
  async signUp({ email, password, options = {} }) {
    try {
      const identityUser = await signup(String(email || '').trim(), password, options.data || {});
      if (identityUser?.confirmedAt || identityUser?.emailVerified) {
        const session = await currentSession(true);
        return { data: { user: session?.user || toAppUser(identityUser), session }, error: null };
      }
      return { data: { user: toAppUser(identityUser), session: null }, error: null };
    } catch (err) {
      return { data: { user: null, session: null }, error: friendlyAuthError(err) };
    }
  },
  async signOut() {
    try {
      await logout();
    } catch (err) {
      console.warn('Sign-out failed:', err?.message || err);
    }
    profileCache = { token: null, value: null };
    emit('SIGNED_OUT', null);
    return { error: null };
  },
  async updateUser(attributes = {}) {
    try {
      const updates = {};
      if (attributes.password) updates.password = attributes.password;
      if (attributes.email) updates.email = attributes.email;
      if (attributes.data) updates.data = attributes.data;
      const identityUser = await updateIdentityUser(updates);
      const server = await loadServerProfile();
      return { data: { user: toAppUser(identityUser, server) }, error: null };
    } catch (err) {
      return { data: { user: null }, error: friendlyAuthError(err) };
    }
  },
  async refreshSession() {
    try {
      await refreshIdentitySession();
      const session = await currentSession();
      return { data: { session, user: session?.user || null }, error: null };
    } catch (err) {
      return { data: { session: null, user: null }, error: makeError(err?.message) };
    }
  },
  async resetPasswordForEmail(email) {
    try {
      await requestPasswordRecovery(String(email || '').trim());
      return { data: {}, error: null };
    } catch (err) {
      return { data: null, error: friendlyAuthError(err) };
    }
  },
  onAuthStateChange(callback) {
    listeners.add(callback);
    // Supabase fires INITIAL_SESSION on subscribe; mirror that.
    currentSession()
      .then((session) => callback('INITIAL_SESSION', session))
      .catch(() => callback('INITIAL_SESSION', null));
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
};

// ---------------------------------------------------------------------------
// Storage (Netlify Blobs via /api/storage)
// ---------------------------------------------------------------------------

function objectUrl(bucket, path) {
  const clean = String(path || '').replace(/^\/+/, '');
  const encoded = clean.split('/').map(encodeURIComponent).join('/');
  const origin = isBrowser ? window.location.origin : '';
  return `${origin}/api/storage/object/${encodeURIComponent(bucket)}/${encoded}`;
}

function bucketApi(bucket) {
  return {
    async upload(path, file, options = {}) {
      try {
        const form = new FormData();
        form.append('bucket', bucket);
        form.append('path', path);
        form.append('upsert', options.upsert ? 'true' : 'false');
        if (options.contentType) form.append('contentType', options.contentType);
        form.append('file', file);
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          credentials: 'same-origin',
          headers: authHeaders(),
          body: form,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return { data: null, error: makeError(payload?.error || `Upload failed (${res.status})`, { status: res.status }) };
        return { data: { path: payload.path, id: payload.path, fullPath: `${bucket}/${payload.path}` }, error: null };
      } catch (err) {
        return { data: null, error: makeError(err?.message || 'Upload failed') };
      }
    },
    getPublicUrl(path) {
      return { data: { publicUrl: objectUrl(bucket, path) } };
    },
    async createSignedUrl(path) {
      return { data: { signedUrl: objectUrl(bucket, path) }, error: null };
    },
    async createSignedUrls(paths) {
      return { data: (paths || []).map((p) => ({ path: p, signedUrl: objectUrl(bucket, p), error: null })), error: null };
    },
    async remove(paths) {
      const result = await postJson('/api/storage/remove', { bucket, paths: Array.isArray(paths) ? paths : [paths] });
      return { data: result.data, error: result.error };
    },
    async download(path) {
      try {
        const res = await fetch(objectUrl(bucket, path), { credentials: 'same-origin', headers: authHeaders() });
        if (!res.ok) return { data: null, error: makeError(`Download failed (${res.status})`) };
        return { data: await res.blob(), error: null };
      } catch (err) {
        return { data: null, error: makeError(err?.message) };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Edge functions: still hosted on Supabase until they are moved
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const functions = {
  async invoke(name, options = {}) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { data: null, error: makeError(`Function ${name} is not available`) };
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          ...(options.headers || {}),
          ...(options.headers?.Authorization ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      const text = await res.text();
      let data = text;
      try {
        data = JSON.parse(text);
      } catch {
        // plain-text response
      }
      if (!res.ok) return { data: null, error: makeError(data?.error || `Function ${name} failed (${res.status})`) };
      return { data, error: null };
    } catch (err) {
      return { data: null, error: makeError(err?.message || `Function ${name} failed`) };
    }
  },
};

// ---------------------------------------------------------------------------
// Realtime: not available yet; subscriptions are accepted but never fire.
// ---------------------------------------------------------------------------

function channel(name) {
  const ch = {
    topic: name,
    on() {
      return ch;
    },
    subscribe(cb) {
      if (typeof cb === 'function') setTimeout(() => cb('SUBSCRIBED'), 0);
      return ch;
    },
    unsubscribe() {
      return Promise.resolve('ok');
    },
    send() {
      return Promise.resolve('ok');
    },
  };
  return ch;
}

export const supabase = {
  from: (table) => new QueryBuilder(table),
  rpc: (fn, args) => new RpcBuilder(fn, args),
  auth,
  storage: { from: (bucket) => bucketApi(bucket) },
  functions,
  channel,
  removeChannel: async () => 'ok',
  removeAllChannels: async () => [],
  getChannels: () => [],
};

export default supabase;
