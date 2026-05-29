// js/tasks.js — Tasks CRUD + SLA rules + Realtime

const Tasks = (() => {
  const DEFAULT_SLA = [
    { format_name: 'SMM post', days_allowed: 1 },
    { format_name: 'Stories', days_allowed: 1 },
    { format_name: 'Banner', days_allowed: 2 },
    { format_name: 'Video/Reels', days_allowed: 3 },
    { format_name: 'Prezentatsiya', days_allowed: 2 },
    { format_name: 'Narxnoma', days_allowed: 1 },
    { format_name: 'POSM material', days_allowed: 2 },
    { format_name: 'Hujjat/Shablon', days_allowed: 1 },
    { format_name: 'Boshqa', days_allowed: 2 },
  ];

  // ---- SLA RULES ----

  async function getSlaRules() {
    try {
      const { data, error } = await window.supabase
        .from('sla_rules')
        .select('*')
        .order('format_name', { ascending: true });

      if (error || !data || data.length === 0) {
        return { data: DEFAULT_SLA, error: null };
      }
      return { data, error: null };
    } catch (err) {
      return { data: DEFAULT_SLA, error: null };
    }
  }

  async function upsertSlaRule(rule) {
    // rule: { format_name, days_allowed, description? }
    const { data, error } = await window.supabase
      .from('sla_rules')
      .upsert(rule, { onConflict: 'format_name' })
      .select()
      .single();
    return { data, error };
  }

  async function deleteSlaRule(id) {
    const { data, error } = await window.supabase
      .from('sla_rules')
      .delete()
      .eq('id', id);
    return { data, error };
  }

  // ---- TASKS ----

  async function getTasks(filters = {}) {
    const {
      status,
      format,
      division,
      assignedTo,
      dateFrom,
      dateTo,
      search,
      page = 1,
      pageSize = 20,
    } = filters;

    const offset = (page - 1) * pageSize;

    let query = window.supabase
      .from('tasks')
      .select(
        '*, assigned_profile:profiles!assigned_to(id,name,role), creator:profiles!created_by(id,name)',
        { count: 'exact' }
      );

    if (status) query = query.eq('status', status);
    if (format) query = query.eq('format', format);
    if (division) query = query.eq('division', division);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (dateFrom) query = query.gte('given_date', dateFrom);
    if (dateTo) query = query.lte('given_date', dateTo);
    if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);

    query = query
      .order('given_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    return { data, count, error };
  }

  async function getMyTasks(userId, filters = {}) {
    return getTasks({ ...filters, assignedTo: userId });
  }

  async function getTaskById(id) {
    const { data, error } = await window.supabase
      .from('tasks')
      .select(
        '*, assigned_profile:profiles!assigned_to(id,name,role), creator:profiles!created_by(id,name), task_comments(*, user:profiles(name,role))'
      )
      .eq('id', id)
      .single();
    return { data, error };
  }

  async function createTask(taskData) {
    const {
      data: { user },
    } = await window.supabase.auth.getUser();

    const payload = {
      ...taskData,
      created_by: user?.id ?? null,
    };

    const { data, error } = await window.supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single();
    return { data, error };
  }

  async function updateTask(id, updates) {
    const { data, error } = await window.supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  async function deleteTask(id) {
    const { data, error } = await window.supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    return { data, error };
  }

  async function updateTaskStatus(id, status, doneDate = null) {
    const updates = { status };
    if (doneDate !== null) updates.done_date = doneDate;
    else if (status === 'done_ontime' || status === 'done_late') {
      updates.done_date = new Date().toISOString().split('T')[0];
    }
    return updateTask(id, updates);
  }

  // ---- COMMENTS ----

  async function getComments(taskId) {
    const { data, error } = await window.supabase
      .from('task_comments')
      .select('*, user:profiles(name, role)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    return { data, error };
  }

  async function addComment(taskId, text, isInternal = false) {
    const {
      data: { user },
    } = await window.supabase.auth.getUser();

    const { data, error } = await window.supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        text,
        is_internal: isInternal,
        user_id: user?.id ?? null,
      })
      .select('*, user:profiles(name, role)')
      .single();
    return { data, error };
  }

  async function deleteComment(commentId) {
    const { data, error } = await window.supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);
    return { data, error };
  }

  // ---- MONTHLY STATS ----

  async function getMonthStats(year, month) {
    // month is 1-based
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month, 0); // last day of month
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

    const { data, error } = await window.supabase
      .from('tasks')
      .select('*, assigned_profile:profiles!assigned_to(id,name,role)')
      .gte('given_date', firstDay)
      .lte('given_date', lastDay);

    if (error) return { data: null, error };

    // calcKPI should be available globally from utils.js
    const stats = typeof calcKPI === 'function' ? calcKPI(data) : data;
    return { data: stats, error: null };
  }

  // ---- REALTIME ----

  let realtimeChannel = null;

  function subscribeToChanges(onInsert, onUpdate, onDelete) {
    if (realtimeChannel) {
      window.supabase.removeChannel(realtimeChannel);
    }
    realtimeChannel = window.supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') onInsert?.(payload.new);
          if (payload.eventType === 'UPDATE') onUpdate?.(payload.new, payload.old);
          if (payload.eventType === 'DELETE') onDelete?.(payload.old);
        }
      )
      .subscribe();
  }

  function unsubscribe() {
    if (realtimeChannel) {
      window.supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  return {
    DEFAULT_SLA,
    getSlaRules,
    upsertSlaRule,
    deleteSlaRule,
    getTasks,
    getMyTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getComments,
    addComment,
    deleteComment,
    getMonthStats,
    subscribeToChanges,
    unsubscribe,
  };
})();
