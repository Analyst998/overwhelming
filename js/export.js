// js/export.js — CSV and Excel export

const Exporter = (() => {
  const TASK_COLUMNS = {
    name: 'Topshiriq nomi',
    format: 'Format',
    division: "Bo'lim",
    given_date: 'Berilgan sana',
    deadline: 'Deadline',
    done_date: 'Bajarilgan sana',
    status: 'Holat',
    reason: 'Kechikish sababi',
    note: 'Izoh',
    assigned_to_name: 'Bajaruvchi',
  };

  const STATUS_LABELS = {
    pending: 'Jarayonda',
    done_ontime: "O'z vaqtida",
    done_late: 'Kechikkan',
    revision: 'Qayta ishlash',
  };

  const SALES_COLUMNS = {
    week_start: 'Hafta boshi',
    week_end: 'Hafta oxiri',
    division: "Bo'lim",
    category: 'Kategoriya',
    product_name: 'Mahsulot nomi',
    sku: 'SKU',
    quantity_sold: 'Miqdor',
    revenue: "Tushum (so'm)",
    revenue_prev_week: "O'tgan hafta",
    revenue_prev_year: "O'tgan yil",
    avg_check: "O'rtacha chek",
    transactions_count: 'Tranzaksiyalar',
    notes: 'Izoh',
  };

  function _formatDate(val) {
    if (!val) return '';
    if (typeof formatDate === 'function') return formatDate(val);
    // Fallback: simple ISO date formatting
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }

  function tasksToRows(tasks) {
    return tasks.map((task) => ({
      name: task.name || '',
      format: task.format || '',
      division: task.division || '',
      given_date: _formatDate(task.given_date),
      deadline: _formatDate(task.deadline),
      done_date: _formatDate(task.done_date),
      status: STATUS_LABELS[task.status] || task.status || '',
      reason: task.reason || '',
      note: task.note || '',
      assigned_to_name:
        task.assigned_profile?.name || task.assigned_to_name || '',
    }));
  }

  function salesToRows(sales) {
    return sales.map((s) => ({
      week_start: _formatDate(s.week_start),
      week_end: _formatDate(s.week_end),
      division: s.division || '',
      category: s.category || '',
      product_name: s.product_name || '',
      sku: s.sku || '',
      quantity_sold: s.quantity_sold ?? '',
      revenue: s.revenue ?? '',
      revenue_prev_week: s.revenue_prev_week ?? '',
      revenue_prev_year: s.revenue_prev_year ?? '',
      avg_check: s.avg_check ?? '',
      transactions_count: s.transactions_count ?? '',
      notes: s.notes || '',
    }));
  }

  function _escapeCSVValue(val) {
    const str = String(val ?? '');
    // Quote if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function _buildCSV(headers, rows) {
    const headerLine = headers.map(_escapeCSVValue).join(',');
    const dataLines = rows.map((row) =>
      Object.values(row).map(_escapeCSVValue).join(',')
    );
    // BOM + header + rows, CRLF line endings
    return '﻿' + [headerLine, ...dataLines].join('\r\n');
  }

  function exportTasksCSV(tasks, filename) {
    filename = filename || 'topshiriqlar.csv';
    const rows = tasksToRows(tasks);
    const headers = Object.values(TASK_COLUMNS);
    const csv = _buildCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  function exportTasksExcel(tasks, filename) {
    filename = filename || 'topshiriqlar.xlsx';
    const rows = tasksToRows(tasks);

    // Build array-of-arrays for SheetJS: first row = headers
    const headers = Object.values(TASK_COLUMNS);
    const aoa = [headers, ...rows.map((r) => Object.values(r))];

    const ws = window.XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    ws['!cols'] = [
      { wch: 35 }, // name
      { wch: 16 }, // format
      { wch: 18 }, // division
      { wch: 14 }, // given_date
      { wch: 14 }, // deadline
      { wch: 16 }, // done_date
      { wch: 16 }, // status
      { wch: 25 }, // reason
      { wch: 25 }, // note
      { wch: 20 }, // assigned_to_name
    ];

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Topshiriqlar');

    const wbArray = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbArray], { type: 'application/octet-stream' });
    downloadBlob(blob, filename);
  }

  function exportSalesCSV(sales, filename) {
    filename = filename || 'sotuv_malumotlari.csv';
    const rows = salesToRows(sales);
    const headers = Object.values(SALES_COLUMNS);
    const csv = _buildCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  function exportSalesExcel(sales, filename, sheetName) {
    filename = filename || 'sotuv_malumotlari.xlsx';
    sheetName = sheetName || 'Sotuv';
    const rows = salesToRows(sales);

    const headers = Object.values(SALES_COLUMNS);
    const aoa = [headers, ...rows.map((r) => Object.values(r))];

    const ws = window.XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 14 }, // week_start
      { wch: 14 }, // week_end
      { wch: 18 }, // division
      { wch: 20 }, // category
      { wch: 28 }, // product_name
      { wch: 14 }, // sku
      { wch: 12 }, // quantity_sold
      { wch: 18 }, // revenue
      { wch: 18 }, // revenue_prev_week
      { wch: 18 }, // revenue_prev_year
      { wch: 16 }, // avg_check
      { wch: 16 }, // transactions_count
      { wch: 25 }, // notes
    ];

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const wbArray = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbArray], { type: 'application/octet-stream' });
    downloadBlob(blob, filename);
  }

  function generateSalesTemplate() {
    const headers = Object.values(SALES_COLUMNS);

    const exampleRows = [
      [
        '2025-01-06', '2025-01-12', "Go'sht bo'limi", 'Mol go\'shti',
        'Mol go\'shti premium', 'SKU-001', 150, 4500000, 4200000, 4100000, 30000, 150, '',
      ],
      [
        '2025-01-06', '2025-01-12', 'Sut mahsulotlari', 'Sut',
        'Qo\'y suti 1L', 'SKU-002', 200, 1800000, 1700000, 1600000, 9000, 200, '',
      ],
      [
        '2025-01-06', '2025-01-12', 'Non-bulochka', 'Non',
        'Oddiy non', 'SKU-003', 500, 2500000, 2400000, 2300000, 5000, 500, 'Misol',
      ],
    ];

    const aoa = [headers, ...exampleRows];

    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 28 },
      { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 16 }, { wch: 16 }, { wch: 25 },
    ];

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Sotuv');

    const wbArray = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbArray], { type: 'application/octet-stream' });
    downloadBlob(blob, 'sotuv_ma_lumotlari_shablon.xlsx');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    exportTasksCSV,
    exportTasksExcel,
    exportSalesCSV,
    exportSalesExcel,
    generateSalesTemplate,
  };
})();
