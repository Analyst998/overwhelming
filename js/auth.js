// js/auth.js — Authentication module for Al-Sahiy CRM
// Requires: supabase-js loaded globally as window.supabase

const Auth = (() => {
  // Current session cache
  let _currentUser = null;
  let _profile = null;

  // ==================== INIT ====================
  // Restore session from Supabase on page load
  async function init() {
    try {
      const { data, error } = await window.supabase.auth.getSession();
      if (error) return { data: null, error };

      const session = data?.session;
      if (session?.user) {
        _currentUser = session.user;
        _profile = await fetchProfile(session.user.id);
      }
      return { data: session, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ==================== LOGIN ====================
  // Login with email + password via Supabase Auth
  async function login(email, password) {
    try {
      const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
      if (error) return { data: null, error };

      _currentUser = data.user;
      if (_currentUser) {
        _profile = await fetchProfile(_currentUser.id);
      }
      return { data: { user: _currentUser, profile: _profile }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ==================== LOGOUT ====================
  async function logout() {
    try {
      const { error } = await window.supabase.auth.signOut();
      _currentUser = null;
      _profile = null;
      return { error };
    } catch (err) {
      return { error: err };
    }
  }

  // ==================== GETTERS ====================
  function getProfile() { return _profile; }
  function getUser()    { return _currentUser; }
  function getRole()    { return _profile?.role || null; }

  // ==================== ROLE CHECKS ====================
  function isAdmin()    { return _profile?.role === 'admin'; }
  function isManager()  { return ['admin', 'manager'].includes(_profile?.role); }
  function isAnalyst()  { return ['admin', 'manager', 'analyst'].includes(_profile?.role); }
  function isDesigner() { return _profile?.role === 'designer'; }

  // ==================== FETCH PROFILE ====================
  // Fetches full profile row from the `profiles` table.
  // If the row doesn't exist (user created before trigger), auto-creates it.
  async function fetchProfile(userId) {
    try {
      const { data, error } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) return data;

      // Profile missing — auto-create with defaults
      const user = (await window.supabase.auth.getUser()).data?.user;
      const name = user?.user_metadata?.name
        || user?.email?.split('@')[0]
        || 'Foydalanuvchi';
      const role = user?.user_metadata?.role || 'designer';

      const { data: created, error: createErr } = await window.supabase
        .from('profiles')
        .upsert({ id: userId, name, role }, { onConflict: 'id' })
        .select()
        .single();

      if (createErr) {
        console.warn('[Auth] fetchProfile auto-create error:', createErr.message);
        // Return a minimal profile so the app doesn't hang on white screen
        return { id: userId, name, role, division: null };
      }
      return created;
    } catch (err) {
      console.warn('[Auth] fetchProfile exception:', err);
      return null;
    }
  }

  // ==================== UPDATE PROFILE ====================
  // Merges `data` into the current user's profile row
  async function updateProfile(data) {
    if (!_currentUser?.id) return { data: null, error: new Error('Foydalanuvchi topilmadi') };
    try {
      const { data: updated, error } = await window.supabase
        .from('profiles')
        .update(data)
        .eq('id', _currentUser.id)
        .select()
        .single();

      if (error) return { data: null, error };
      // Refresh local cache
      _profile = { ..._profile, ...updated };
      return { data: _profile, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ==================== AUTH STATE LISTENER ====================
  // Subscribe to Supabase auth state changes (login / logout / token refresh)
  // callback(event, session, profile)
  function onAuthChange(callback) {
    window.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        _currentUser = session.user;
        _profile = await fetchProfile(session.user.id);
      } else {
        _currentUser = null;
        _profile = null;
      }
      callback(event, session, _profile);
    });
  }

  // ==================== PUBLIC API ====================
  return {
    init,
    login,
    logout,
    getProfile,
    getUser,
    getRole,
    isAdmin,
    isManager,
    isAnalyst,
    isDesigner,
    fetchProfile,
    updateProfile,
    onAuthChange,
  };
})();
