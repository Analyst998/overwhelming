// js/sales.js — Sales analytics module

const Sales = (() => {

  // ==================== DATA FETCHING ====================

  // Get aggregated weekly summary
  // Returns { revenue, transactions, avgCheck, quantity, revenuePrevWeek, revenuePrevYear }
  async function getWeeklySummary(weekStart, weekEnd, division = null) {
    try {
      let query = window.supabase
        .from('sales_data')
        .select('revenue, transactions_count, avg_check, quantity_sold, revenue_prev_week, revenue_prev_year')
        .gte('week_start', weekStart)
        .lte('week_end', weekEnd);

      if (division !== null) {
        query = query.eq('division', division);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      const revenue = data.reduce((s, r) => s + (r.revenue || 0), 0);
      const transactions = data.reduce((s, r) => s + (r.transactions_count || 0), 0);
      const quantity = data.reduce((s, r) => s + (r.quantity_sold || 0), 0);
      const revenuePrevWeek = data.reduce((s, r) => s + (r.revenue_prev_week || 0), 0);
      const revenuePrevYear = data.reduce((s, r) => s + (r.revenue_prev_year || 0), 0);
      const avgCheck = transactions > 0 ? revenue / transactions : 0;

      return {
        data: { revenue, transactions, avgCheck, quantity, revenuePrevWeek, revenuePrevYear },
        error: null
      };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Get last N weeks of weekly totals for chart
  // Returns array of { weekLabel, weekStart, revenue, revenuePrevYear } sorted by week
  async function getWeeklyTrend(nWeeks = 8, division = null) {
    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - nWeeks * 7);
      const fromStr = from.toISOString().split('T')[0];

      let query = window.supabase
        .from('sales_data')
        .select('week_start, revenue, revenue_prev_year')
        .gte('week_start', fromStr)
        .order('week_start', { ascending: true });

      if (division !== null) {
        query = query.eq('division', division);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      // Group by week_start
      const weekMap = new Map();
      for (const row of data) {
        const key = row.week_start;
        if (!weekMap.has(key)) {
          weekMap.set(key, { weekStart: key, revenue: 0, revenuePrevYear: 0 });
        }
        const entry = weekMap.get(key);
        entry.revenue += row.revenue || 0;
        entry.revenuePrevYear += row.revenue_prev_year || 0;
      }

      const result = Array.from(weekMap.values())
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .map(w => ({
          weekStart: w.weekStart,
          weekLabel: formatWeekLabel(w.weekStart),
          revenue: w.revenue,
          revenuePrevYear: w.revenuePrevYear
        }));

      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Get division breakdown for a week
  // Returns array of { division, revenue, revenuePrevWeek, transactions, avgCheck, quantity }
  // sorted by revenue desc
  async function getDivisionBreakdown(weekStart, weekEnd) {
    try {
      const { data, error } = await window.supabase
        .from('sales_data')
        .select('division, revenue, revenue_prev_week, revenue_prev_year, transactions_count, avg_check, quantity_sold')
        .gte('week_start', weekStart)
        .lte('week_end', weekEnd);

      if (error) return { data: null, error };

      const divMap = aggregateBy(data, r => r.division);
      const result = Array.from(divMap.entries()).map(([division, agg]) => ({
        division,
        revenue: agg.revenue,
        revenuePrevWeek: agg.revenuePrevWeek,
        revenuePrevYear: agg.revenuePrevYear,
        transactions: agg.transactions,
        quantity: agg.quantity,
        avgCheck: agg.transactions > 0 ? agg.revenue / agg.transactions : 0,
        trendWow: calcTrend(agg.revenue, agg.revenuePrevWeek),
        trendYoy: calcTrend(agg.revenue, agg.revenuePrevYear)
      }));

      result.sort((a, b) => b.revenue - a.revenue);
      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Get top SKUs for a period
  // filters: { weekStart, weekEnd, division, category, sortBy: 'revenue'|'quantity_sold'|'avg_check', search, page, pageSize }
  async function getTopProducts(filters = {}) {
    try {
      const {
        weekStart,
        weekEnd,
        division = null,
        category = null,
        sortBy = 'revenue',
        search = null,
        page = 1,
        pageSize = 20
      } = filters;

      const offset = (page - 1) * pageSize;

      let query = window.supabase
        .from('sales_data')
        .select('*', { count: 'exact' });

      if (weekStart) query = query.gte('week_start', weekStart);
      if (weekEnd) query = query.lte('week_end', weekEnd);
      if (division) query = query.eq('division', division);
      if (category) query = query.eq('category', category);
      if (search) query = query.ilike('product_name', `%${search}%`);

      query = query
        .order(sortBy, { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, count, error } = await query;
      return { data, count, error };
    } catch (err) {
      return { data: null, count: 0, error: err };
    }
  }

  // Get division detail (top SKUs for a specific division)
  async function getDivisionDetail(division, weekStart, weekEnd, limit = 10) {
    try {
      const { data, error } = await window.supabase
        .from('sales_data')
        .select('product_name, sku, category, revenue, quantity_sold, avg_check, transactions_count')
        .eq('division', division)
        .gte('week_start', weekStart)
        .lte('week_end', weekEnd)
        .order('revenue', { ascending: false })
        .limit(limit);

      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Get available weeks (distinct week_start values) for the period selector
  async function getAvailableWeeks() {
    try {
      const { data, error } = await window.supabase
        .from('sales_data')
        .select('week_start, week_end')
        .order('week_start', { ascending: false })
        .limit(52 * 10); // fetch many, then deduplicate

      if (error) return { data: null, error };

      // Deduplicate by week_start
      const seen = new Set();
      const weeks = [];
      for (const row of data) {
        if (!seen.has(row.week_start)) {
          seen.add(row.week_start);
          weeks.push({ weekStart: row.week_start, weekEnd: row.week_end });
          if (weeks.length >= 52) break;
        }
      }

      return { data: weeks, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ==================== STATE ====================

  let state = {
    weekStart: null,
    weekEnd: null,
    division: null,
    compareMode: 'wow', // 'wow' or 'yoy'
    activeSubTab: 'overview', // 'overview' | 'divisions' | 'products'
  };

  function getState() { return { ...state }; }
  function setState(updates) { Object.assign(state, updates); }

  // ==================== HELPERS ====================

  // Aggregate rows by a grouping key function
  // Returns Map: key => { revenue, revenuePrevWeek, revenuePrevYear, transactions, quantity, avgCheck }
  function aggregateBy(rows, keyFn) {
    const map = new Map();
    for (const row of rows) {
      const key = keyFn(row);
      if (!map.has(key)) {
        map.set(key, {
          revenue: 0,
          revenuePrevWeek: 0,
          revenuePrevYear: 0,
          transactions: 0,
          quantity: 0,
        });
      }
      const agg = map.get(key);
      agg.revenue += row.revenue || 0;
      agg.revenuePrevWeek += row.revenue_prev_week || 0;
      agg.revenuePrevYear += row.revenue_prev_year || 0;
      agg.transactions += row.transactions_count || 0;
      agg.quantity += row.quantity_sold || 0;
    }
    // Compute avgCheck per group
    for (const agg of map.values()) {
      agg.avgCheck = agg.transactions > 0 ? agg.revenue / agg.transactions : 0;
    }
    return map;
  }

  // Calculate trend percentage
  function calcTrend(current, previous) {
    if (!previous || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
  }

  // Format a week_start date string as a short label, e.g. "12 May"
  function formatWeekLabel(weekStart) {
    if (!weekStart) return '';
    const d = new Date(weekStart);
    if (isNaN(d)) return weekStart;
    return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  }

  // Division list
  const DIVISIONS = [
    "Umumiy",
    "Apteka",
    "Kanstovar",
    "Xoztovar",
    "Non markazi",
    "Texnomir",
    "Paynet",
    "Al-Sahiy 1-qavat",
    "Al-Sahiy 2-qavat"
  ];

  return {
    getWeeklySummary,
    getWeeklyTrend,
    getDivisionBreakdown,
    getTopProducts,
    getDivisionDetail,
    getAvailableWeeks,
    getState,
    setState,
    aggregateBy,
    calcTrend,
    DIVISIONS
  };
})();
