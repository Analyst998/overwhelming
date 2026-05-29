// js/utils.js — Shared utility functions for Al-Sahiy CRM
// No dependencies required (supabase optional for migrateFromLocalStorage)

// ==================== I18N ====================
const I18N = {
  uz: {
    dashboard:        'Bosh sahifa',
    tasks:            'Topshiriqlar',
    my_tasks:         'Mening topshiriqlarim',
    sales:            'Sotuv tahlili',
    reports:          'Hisobotlar',
    sla_rules:        'SLA qoidalari',
    admin:            'Boshqaruv',
    logout:           'Chiqish',
    add_task:         "Topshiriq qo'shish",
    save:             'Saqlash',
    cancel:           'Bekor qilish',
    delete:           "O'chirish",
    edit:             'Tahrirlash',
    search:           'Qidirish...',
    status_pending:   'Jarayonda',
    status_ontime:    "O'z vaqtida",
    status_late:      'Kechikkan',
    status_revision:  'Qayta ishlash',
    total:            'Jami',
    ontime:           "O'z vaqtida",
    late:             'Kechikkan',
    revision:         'Revision',
    all:              'Barchasi',
    month:            'Oy',
    week:             'Hafta',
    loading:          'Yuklanmoqda...',
    no_data:          "Ma'lumot yo'q",
    confirm_delete:   "O'chirishni tasdiqlaysizmi?",
    revenue:          'Tushum',
    transactions:     'Tranzaksiyalar',
    avg_check:        "O'rtacha chek",
    quantity:         'Miqdor',
    this_week:        'Bu hafta',
    last_week:        "O'tgan hafta",
    four_weeks:       '4 hafta',
    vs_prev_week:     "o'tgan haftaga nisbatan",
    vs_prev_year:     "o'tgan yilga nisbatan",
    upload_excel:     'Excel yuklash',
    download_template:'Shablon yuklab olish',
    import_data:      "Ma'lumotlarni import qilish",
    rows_imported:    'qator import qilindi',
    name:             'Ism',
    username:         'Foydalanuvchi nomi',
    password:         'Parol',
    role:             'Rol',
    actions:          'Amallar',
    close:            'Yopish',
    format:           'Format',
    division:         "Bo'lim",
    given_date:       'Berilgan sana',
    deadline:         'Deadline',
    done_date:        'Bajarilgan sana',
    status:           'Holat',
    reason:           'Sabab',
    note:             'Izoh',
    kpi_score:        'KPI ball',
    grade:            'Baho',
    error_required:   "Majburiy maydonlarni to'ldiring",
    error_login:      "Login yoki parol noto'g'ri",
    saved:            'Saqlandi!',
    deleted:          "O'chirildi",
    updated:          'Yangilandi',
    migrate_title:    "Eski ma'lumotlarni ko'chirish",
    migrate_confirm:  "ta eski topshiriq topildi. Ko'chirasizmi?",
    migrate_success:  'ta topshiriq muvaffaqiyatli ko'chirildi',
    migrate_none:     "Ko'chiriladigan ma'lumot yo'q",
  },
  ru: {
    dashboard:        'Главная',
    tasks:            'Задачи',
    my_tasks:         'Мои задачи',
    sales:            'Аналитика продаж',
    reports:          'Отчёты',
    sla_rules:        'SLA Правила',
    admin:            'Администрирование',
    logout:           'Выйти',
    add_task:         'Добавить задачу',
    save:             'Сохранить',
    cancel:           'Отмена',
    delete:           'Удалить',
    edit:             'Изменить',
    search:           'Поиск...',
    status_pending:   'В процессе',
    status_ontime:    'Вовремя',
    status_late:      'Просрочено',
    status_revision:  'На доработке',
    total:            'Всего',
    ontime:           'Вовремя',
    late:             'Просрочено',
    revision:         'Ревизия',
    all:              'Все',
    month:            'Месяц',
    week:             'Неделя',
    loading:          'Загрузка...',
    no_data:          'Нет данных',
    confirm_delete:   'Подтвердить удаление?',
    revenue:          'Выручка',
    transactions:     'Транзакции',
    avg_check:        'Средний чек',
    quantity:         'Количество',
    this_week:        'Эта неделя',
    last_week:        'Прошлая неделя',
    four_weeks:       '4 недели',
    vs_prev_week:     'к прошлой неделе',
    vs_prev_year:     'к прошлому году',
    upload_excel:     'Загрузить Excel',
    download_template:'Скачать шаблон',
    import_data:      'Импортировать данные',
    rows_imported:    'строк импортировано',
    name:             'Имя',
    username:         'Имя пользователя',
    password:         'Пароль',
    role:             'Роль',
    actions:          'Действия',
    close:            'Закрыть',
    format:           'Формат',
    division:         'Отдел',
    given_date:       'Дата выдачи',
    deadline:         'Дедлайн',
    done_date:        'Дата выполнения',
    status:           'Статус',
    reason:           'Причина',
    note:             'Заметка',
    kpi_score:        'KPI балл',
    grade:            'Оценка',
    error_required:   'Заполните обязательные поля',
    error_login:      'Неверный логин или пароль',
    saved:            'Сохранено!',
    deleted:          'Удалено',
    updated:          'Обновлено',
    migrate_title:    'Перенос старых данных',
    migrate_confirm:  'задач найдено. Перенести?',
    migrate_success:  'задач успешно перенесено',
    migrate_none:     'Нет данных для переноса',
  },
};

let currentLang = localStorage.getItem('alsahiy_lang') || 'uz';

/**
 * Translate a key to the current language.
 * Falls back to Uzbek, then to the key itself.
 */
function t(key) {
  return I18N[currentLang]?.[key] ?? I18N['uz']?.[key] ?? key;
}

function setLang(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  localStorage.setItem('alsahiy_lang', lang);
}

function getLang() { return currentLang; }

// ==================== DATE UTILS ====================
const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const MONTHS = () => currentLang === 'ru' ? MONTHS_RU : MONTHS_UZ;

/**
 * Format ISO date string to short form: "15-Yan 2025"
 */
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d)) return str;
  const mon = MONTHS()[d.getMonth()].slice(0, 3);
  return `${d.getDate()}-${mon} ${d.getFullYear()}`;
}

/**
 * Format ISO date string to full form: "15 Yanvar 2025"
 */
function formatDateFull(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d)) return str;
  return `${d.getDate()} ${MONTHS()[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format a Date object to ISO string "YYYY-MM-DD"
 */
function formatDateISO(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns { start: Date, end: Date } for the Monday–Sunday week
 * containing the given date (defaults to today).
 */
function getWeekRange(date) {
  const d = date ? new Date(date) : new Date();
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const dayOfWeek = d.getDay();
  const diffToMonday = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Returns a human-readable week label: "13-19 Yan 2025"
 */
function getWeekLabel(weekStart) {
  const start = weekStart instanceof Date ? weekStart : new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const mon = MONTHS()[end.getMonth()].slice(0, 3);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}-${end.getDate()} ${mon} ${end.getFullYear()}`;
  }
  const monStart = MONTHS()[start.getMonth()].slice(0, 3);
  return `${start.getDate()} ${monStart} – ${end.getDate()} ${mon} ${end.getFullYear()}`;
}

/**
 * Returns array of last 8 full weeks (Mon-Sun),
 * each as { start: Date, end: Date, label: string }
 */
function getLast8Weeks() {
  const result = [];
  const today = new Date();
  const { start: currentWeekStart } = getWeekRange(today);

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    result.push({
      start: new Date(weekStart),
      end:   weekEnd,
      label: getWeekLabel(weekStart),
    });
  }
  return result;
}

/**
 * Add n days to a date, returns a new Date.
 */
function addDays(date, n) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Number of calendar days from `from` to `to`.
 * Positive = to is in the future.
 */
function daysDiff(from, to) {
  const a = (from instanceof Date ? from : new Date(from)).setHours(0,0,0,0);
  const b = (to   instanceof Date ? to   : new Date(to)).setHours(0,0,0,0);
  return Math.round((b - a) / 86400000);
}

/**
 * Returns true if `deadline` is before today.
 */
function isOverdue(deadline) {
  if (!deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  return d < today;
}

// ==================== NUMBER UTILS ====================

/**
 * Format large number with space as thousands separator: "45 230 000"
 */
function formatMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format number in short form: "45.2M", "1.2K", "890"
 */
function formatMoneyShort(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${Math.round(abs)}`;
}

/**
 * Format a number as percentage string: "12.5%"
 */
function formatPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${parseFloat(n.toFixed(1))}%`;
}

/**
 * Calculate trend between current and previous period values.
 * Returns { pct: number, direction: 'up'|'down'|'neutral' }
 */
function calcTrend(current, previous) {
  if (!previous || previous === 0) {
    return { pct: 0, direction: 'neutral' };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  let direction = 'neutral';
  if (rounded > 0.5)  direction = 'up';
  if (rounded < -0.5) direction = 'down';
  return { pct: rounded, direction };
}

// ==================== SPARKLINE SVG ====================

/**
 * Generate an inline SVG sparkline polyline from an array of numbers.
 * Returns an SVG string.
 *
 * @param {number[]} data   - Array of values to plot
 * @param {number}   width  - SVG width in px (default 80)
 * @param {number}   height - SVG height in px (default 28)
 * @param {string}   color  - Stroke color (default brand red)
 * @returns {string} SVG markup string
 */
function renderSparkline(data, width = 80, height = 28, color = '#C92C35') {
  if (!data || data.length < 2) {
    return `<svg class="sparkline" width="${width}" height="${height}"></svg>`;
  }

  const filtered = data.map(v => (v === null || v === undefined || isNaN(v)) ? 0 : v);
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min || 1; // avoid division by zero

  const padX = 2;
  const padY = 3;
  const innerW = width  - padX * 2;
  const innerH = height - padY * 2;

  // Map each value to SVG coordinates
  const points = filtered.map((v, i) => {
    const x = padX + (i / (filtered.length - 1)) * innerW;
    const y = padY + (1 - (v - min) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Build a filled area path for gradient fill
  const firstX = padX;
  const lastX  = padX + innerW;
  const bottom = padY + innerH;

  const areaPath = `M${firstX.toFixed(1)},${bottom} ` +
    points.map((p, i) => (i === 0 ? `L${p}` : `L${p}`)).join(' ') +
    ` L${lastX.toFixed(1)},${bottom} Z`;

  const uid = 'sp' + Math.random().toString(36).slice(2, 7);

  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${color}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="${areaPath}" fill="url(#${uid})"/>
  <polyline
    points="${points.join(' ')}"
    fill="none"
    stroke="${color}"
    stroke-width="1.5"
    stroke-linejoin="round"
    stroke-linecap="round"
  />
  <circle
    cx="${points[points.length - 1].split(',')[0]}"
    cy="${points[points.length - 1].split(',')[1]}"
    r="2.5"
    fill="${color}"
  />
</svg>`;
}

// ==================== MIGRATION FROM LOCALSTORAGE ====================

/**
 * Migrates old localStorage tasks (alsahiy_sla_tasks) to Supabase.
 * Shows a confirm dialog before inserting.
 * Returns { migrated: number, errors: number }
 *
 * Requires window.supabase to be available.
 */
async function migrateFromLocalStorage() {
  const oldTasks = JSON.parse(localStorage.getItem('alsahiy_sla_tasks') || '[]');
  if (!oldTasks.length) {
    return { migrated: 0, errors: 0 };
  }

  // Ask user for confirmation
  const confirmed = window.confirm(
    `${oldTasks.length} ${t('migrate_confirm')}`
  );
  if (!confirmed) return { migrated: 0, errors: 0 };

  // Check supabase availability
  if (!window.supabase) {
    console.warn('[migrate] window.supabase is not available yet');
    return { migrated: 0, errors: oldTasks.length };
  }

  // Map old localStorage format → Supabase table columns
  const mapped = oldTasks.map(task => ({
    // Use existing id if it looks like a UUID, otherwise let Supabase generate one
    ...(task.id && String(task.id).length > 15 ? {} : {}),
    name:        task.name        || '',
    format:      task.format      || '',
    division:    task.division    || 'Umumiy',
    given_date:  task.givenDate   || null,
    deadline:    task.deadline    || null,
    done_date:   task.doneDate    || null,
    status:      task.status      || 'pending',
    reason:      task.reason      || null,
    note:        task.note        || null,
    created_at:  task.createdAt   || new Date().toISOString(),
    comments:    JSON.stringify(task.comments || []),
    migrated:    true,
  }));

  let migrated = 0;
  let errors   = 0;

  // Batch insert in chunks of 50
  const CHUNK = 50;
  for (let i = 0; i < mapped.length; i += CHUNK) {
    const chunk = mapped.slice(i, i + CHUNK);
    try {
      const { error } = await window.supabase
        .from('tasks')
        .insert(chunk);

      if (error) {
        console.error('[migrate] Insert error:', error.message);
        errors += chunk.length;
      } else {
        migrated += chunk.length;
      }
    } catch (err) {
      console.error('[migrate] Exception:', err);
      errors += chunk.length;
    }
  }

  // Clear localStorage on full success
  if (errors === 0) {
    localStorage.removeItem('alsahiy_sla_tasks');
    console.info(`[migrate] Cleared localStorage after migrating ${migrated} tasks.`);
  } else {
    console.warn(`[migrate] ${errors} tasks failed; localStorage NOT cleared.`);
  }

  return { migrated, errors };
}

// ==================== KPI CALC ====================

const KPI_THRESHOLD    = 60;
const ONTIME_WEIGHT    = 0.90;
const REVISION_WEIGHT  = 0.10;

/**
 * Calculate KPI statistics from a list of task objects.
 * Formula: KPI = (Ontime%) * 0.90 + (100 - Revision%) * 0.10
 *
 * @param {Object[]} tasks  - Array of task objects with a `status` field
 * @returns {Object} { total, ontime, late, revision, ontimePct, latePct, revisionPct, score }
 */
function calcKPI(tasks) {
  const total = tasks.length;
  if (!total) {
    return {
      total: 0, ontime: 0, late: 0, revision: 0,
      ontimePct: 0, latePct: 0, revisionPct: 0, score: null,
    };
  }

  const ontime   = tasks.filter(t => t.status === 'done_ontime').length;
  const late     = tasks.filter(t => t.status === 'done_late').length;
  const revision = tasks.filter(t => t.status === 'revision').length;

  const ontimePct   = Math.round((ontime   / total) * 100);
  const latePct     = Math.round((late     / total) * 100);
  const revisionPct = Math.round((revision / total) * 100);

  const score = Math.round(
    ontimePct * ONTIME_WEIGHT + (100 - revisionPct) * REVISION_WEIGHT
  );

  return { total, ontime, late, revision, ontimePct, latePct, revisionPct, score };
}

/**
 * Return letter grade and display color for a KPI score.
 *
 * @param {number|null} score
 * @returns {{ letter: string, color: string }}
 */
function getGrade(score) {
  if (score === null || score === undefined) return { letter: '—', color: '#888888' };
  if (score >= 95) return { letter: 'A+', color: '#218F6D' };
  if (score >= 85) return { letter: 'A',  color: '#218F6D' };
  if (score >= 75) return { letter: 'B',  color: '#D97706' };
  if (score >= KPI_THRESHOLD) return { letter: 'C', color: '#D97706' };
  return { letter: 'D', color: '#C92C35' };
}
