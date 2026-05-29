// js/upload.js — Excel/CSV import for sales data

const Uploader = (() => {

  const REQUIRED_COLUMNS = ['week_start', 'week_end', 'division', 'revenue'];

  const COLUMN_MAP = {
    // Maps possible Excel header variations to schema column names
    'week_start':        ['week_start', 'hafta_boshi', 'начало недели'],
    'week_end':          ['week_end', 'hafta_oxiri', 'конец недели'],
    'division':          ['division', 'bolim', 'bo\'lim', 'отдел'],
    'category':          ['category', 'kategoriya', 'категория'],
    'product_name':      ['product_name', 'mahsulot', 'товар', 'название'],
    'sku':               ['sku', 'артикул'],
    'quantity_sold':     ['quantity_sold', 'miqdor', 'количество', 'qty'],
    'revenue':           ['revenue', 'tushum', 'выручка'],
    'revenue_prev_week': ['revenue_prev_week', 'otgan_hafta', 'прошлая неделя'],
    'revenue_prev_year': ['revenue_prev_year', 'otgan_yil', 'прошлый год'],
    'avg_check':         ['avg_check', 'ortacha_chek', 'средний чек'],
    'transactions_count':['transactions_count', 'tranzaksiyalar', 'транзакции'],
    'notes':             ['notes', 'izoh', 'примечание'],
  };

  // Parse Excel/CSV file → array of row objects
  // Returns { rows, headers, weekStart, weekEnd, errors }
  async function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });

          if (!rawRows.length) {
            resolve({ rows: [], headers: [], weekStart: null, weekEnd: null, errors: ['Fayl bo\'sh yoki ma\'lumot topilmadi'] });
            return;
          }

          // Map column names
          const mapped = mapColumns(rawRows);

          // Validate rows
          const { valid, errors } = validateRows(mapped.rows);

          // Extract week range from data (use first and last valid row)
          const weekStart = valid.length ? valid[0].week_start || null : null;
          const weekEnd   = valid.length ? valid[valid.length - 1].week_end || null : null;

          resolve({ rows: valid, headers: mapped.headers, weekStart, weekEnd, errors });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Faylni o\'qishda xatolik yuz berdi'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Map raw Excel headers to schema column names
  function mapColumns(rawRows) {
    if (!rawRows.length) return { rows: [], headers: [] };
    const rawHeaders = Object.keys(rawRows[0]);
    const headerMap = {}; // rawHeader → schemaColumn

    for (const rawHeader of rawHeaders) {
      const normalized = rawHeader.toLowerCase().trim().replace(/\s+/g, '_');
      for (const [schemaCol, variants] of Object.entries(COLUMN_MAP)) {
        if (variants.includes(normalized) || variants.includes(rawHeader.toLowerCase())) {
          headerMap[rawHeader] = schemaCol;
          break;
        }
      }
    }

    const rows = rawRows.map(raw => {
      const row = {};
      for (const [rawH, schemaCol] of Object.entries(headerMap)) {
        row[schemaCol] = raw[rawH];
      }
      return row;
    });

    return { rows, headers: Object.values(headerMap) };
  }

  // Validate rows: check required fields, number formats, date formats
  // Returns { valid: Row[], errors: string[] }
  function validateRows(rows) {
    const valid = [];
    const errors = [];

    rows.forEach((row, i) => {
      const rowErrors = [];

      // Check required columns
      for (const col of REQUIRED_COLUMNS) {
        if (row[col] === undefined || row[col] === null || row[col] === '') {
          rowErrors.push(`${i + 2}-qator: "${col}" bo'sh`);
        }
      }

      // Parse/validate dates
      if (row.week_start) row.week_start = parseDate(row.week_start);
      if (row.week_end)   row.week_end   = parseDate(row.week_end);

      // Parse numbers
      const numFields = ['quantity_sold', 'revenue', 'revenue_prev_week', 'revenue_prev_year', 'avg_check', 'transactions_count'];
      for (const f of numFields) {
        if (row[f] !== undefined && row[f] !== '') {
          const n = parseFloat(String(row[f]).replace(/[^0-9.]/g, ''));
          row[f] = isNaN(n) ? 0 : n;
        } else {
          row[f] = 0;
        }
      }

      if (rowErrors.length) {
        errors.push(...rowErrors);
      } else {
        valid.push(row);
      }
    });

    return { valid, errors };
  }

  // Parse a date value into YYYY-MM-DD string
  function parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    const str = String(val).trim();
    // Try formats: DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY
    const patterns = [
      /^(\d{2})\.(\d{2})\.(\d{4})$/,  // DD.MM.YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/,    // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
    ];
    for (const [i, p] of patterns.entries()) {
      const m = str.match(p);
      if (m) {
        if (i === 0 || i === 2) return `${m[3]}-${m[2]}-${m[1]}`; // reorder to YYYY-MM-DD
        if (i === 1) return str;
      }
    }
    return str; // return as-is and let Supabase/DB handle it
  }

  // Insert rows in batches of 100 into Supabase
  // onProgress(done, total) callback for progress bar
  async function insertRows(rows, uploadedBy, onProgress) {
    const BATCH_SIZE = 100;
    let inserted = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(r => ({ ...r, uploaded_by: uploadedBy }));
      const { error } = await window.supabase.from('sales_data').insert(batch);
      if (error) {
        errors.push(error.message);
      } else {
        inserted += batch.length;
      }
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, rows.length), rows.length);
      }
    }

    return { inserted, errors };
  }

  // Log the upload in sales_uploads_log
  async function logUpload({ filename, weekStart, weekEnd, rowsImported, uploadedBy, status, errorMessage }) {
    const { error } = await window.supabase.from('sales_uploads_log').insert({
      filename,
      week_start:    weekStart,
      week_end:      weekEnd,
      rows_imported: rowsImported,
      uploaded_by:   uploadedBy,
      status,
      error_message: errorMessage || null
    });
    return { error };
  }

  // Get upload logs
  async function getUploadLogs(limit = 20) {
    const { data, error } = await window.supabase
      .from('sales_uploads_log')
      .select('*, uploader:profiles!uploaded_by(name)')
      .order('uploaded_at', { ascending: false })
      .limit(limit);
    return { data, error };
  }

  // Full upload flow — step 1: parse and return preview data for UI confirmation
  async function uploadFile(file, uploadedBy, onProgress) {
    const parsed = await parseFile(file);
    return parsed; // UI shows preview first, then calls confirmUpload
  }

  // Full upload flow — step 2: after user confirms, insert rows and log
  async function confirmUpload(rows, filename, weekStart, weekEnd, uploadedBy, onProgress) {
    const result = await insertRows(rows, uploadedBy, onProgress);
    await logUpload({
      filename,
      weekStart,
      weekEnd,
      rowsImported:  result.inserted,
      uploadedBy,
      status:        result.errors.length ? 'error' : 'success',
      errorMessage:  result.errors.length ? result.errors.join('; ') : null
    });
    return result;
  }

  return {
    parseFile,
    mapColumns,
    validateRows,
    parseDate,
    insertRows,
    logUpload,
    uploadFile,
    confirmUpload,
    getUploadLogs,
    COLUMN_MAP,
    REQUIRED_COLUMNS
  };
})();
