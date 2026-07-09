import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ReportSummaryCards from '../../components/reports/ReportSummaryCards';
import ReportDetailsTable from '../../components/reports/ReportDetailsTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';

/**
 * Add Sinhala font support to a jsPDF document.
 * Loads the font from /public/fonts/ at runtime, registers it with jsPDF,
 * and returns the font family name to use with doc.setFont().
 */
async function addSinhalaFont(doc) {
  const fontPath = '/fonts/NotoSansSinhala-Regular.ttf';
  const res = await fetch(fontPath);
  const buffer = await res.arrayBuffer();
  const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
  doc.addFileToVFS('NotoSansSinhala-Regular.ttf', base64);
  doc.addFont('NotoSansSinhala-Regular.ttf', 'NotoSansSinhala', 'normal');
  return 'NotoSansSinhala';
}

/**
 * Preprocesses Sinhala Unicode text by swapping and decomposing left-combining
 * vowel signs (like the kombuwa) so they render correctly in non-shaping PDF engines.
 */
function shapeSinhala(text) {
  if (!text) return '';
  let processed = text;
  
  // Decompose and reorder double/composite vowels containing kombuwa
  // ේ (\u0DDA) -> ෙ (\u0DD9) + Consonant + ් (\u0DCA)
  processed = processed.replace(/([\u0D9A-\u0DC6](?:\u0DCA[\u0D9A-\u0DC6])?)\u0DDA/g, '\u0DD9$1\u0DCA');
  
  // ො (\u0DDC) -> ෙ (\u0DD9) + Consonant + ා (\u0DCF)
  processed = processed.replace(/([\u0D9A-\u0DC6](?:\u0DCA[\u0D9A-\u0DC6])?)\u0DDC/g, '\u0DD9$1\u0DCF');
  
  // ෝ (\u0DDD) -> ෙ (\u0DD9) + Consonant + ා (\u0DCF) + ් (\u0DCA)
  processed = processed.replace(/([\u0D9A-\u0DC6](?:\u0DCA[\u0D9A-\u0DC6])?)\u0DDD/g, '\u0DD9$1\u0DCF\u0DCA');
  
  // ෞ (\u0DDE) -> ෙ (\u0DD9) + Consonant + ෟ (\u0DDF)
  processed = processed.replace(/([\u0D9A-\u0DC6](?:\u0DCA[\u0D9A-\u0DC6])?)\u0DDE/g, '\u0DD9$1\u0DDF');
  
  // Swap simple left-combining vowels:
  // ෙ (\u0DD9) -> ෙ (\u0DD9) + Consonant
  processed = processed.replace(/([\u0D9A-\u0DC6](?:\u0DCA[\u0D9A-\u0DC6])?)\u0DD9/g, '\u0DD9$1');
  
  // ෛ (\u0DDB) -> ෛ (\u0DDB) + Consonant
  processed = processed.replace(/([\u0D9A-\u0DC6](?:\u0DCA[\u0D9A-\u0DC6])?)\u0DDB/g, '\u0DDB$1');
  
  return processed;
}

const REPORT_TYPES = [
  { id: 'circulation', label: 'Circulation Report', icon: 'sync_alt' },
  { id: 'members', label: 'Member Activity', icon: 'group' },
  { id: 'popular-books', label: 'Popular Books', icon: 'trending_up' },
  { id: 'fines', label: 'Fine Collection', icon: 'payments' },
];

const PRESETS = [
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

function getRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === 'month') return { startDate: `${y}-${String(m + 1).padStart(2, '0')}-01`, endDate: now.toISOString().split('T')[0] };
  if (preset === 'lastMonth') { const lm = m === 0 ? 11 : m - 1; const ly = m === 0 ? y - 1 : y; return { startDate: `${ly}-${String(lm + 1).padStart(2, '0')}-01`, endDate: `${ly}-${String(lm + 1).padStart(2, '0')}-${new Date(ly, lm + 1, 0).getDate()}` }; }
  if (preset === 'year') return { startDate: `${y}-01-01`, endDate: now.toISOString().split('T')[0] };
  return { startDate: '', endDate: '' };
}

export default function ReportsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState('circulation');
  const [dateRange, setDateRange] = useState(getRange('month'));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [excelGenerating, setExcelGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  useEffect(() => { if (user && user.role !== 'librarian') navigate('/dashboard', { replace: true }); }, [user, navigate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { ...dateRange };
      const res = await api.get(`/library/reports/${reportType}`, { params, headers: { Authorization: `Bearer ${token}` } });
      setReportData(res.data);
    } catch (err) { console.error(err); showToast('Failed to generate report.', 'error'); }
    finally { setLoading(false); }
  };

  const applyPreset = (id) => {
    setDateRange(getRange(id));
  };

  // PDF Generation
  const generatePDF = async () => {
    if (!reportData) { showToast('Please generate a report first before downloading PDF.', 'error'); return; }
    setPdfGenerating(true);
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString();

      // Register Sinhala font for Sinhala text support
      const sinhalaFont = await addSinhalaFont(doc);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(26, 18, 69);
      doc.text('Kawudulla Maha Vidyalaya Library', 14, 20);
      doc.setFontSize(12);
      doc.text(reportType.charAt(0).toUpperCase() + reportType.slice(1).replace('-', ' ') + ' Report', 14, 30);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const rangeStr = dateRange.startDate ? `${dateRange.startDate} to ${dateRange.endDate || 'Now'}` : 'All Time';
      doc.text(`Period: ${rangeStr} | Generated: ${now}`, 14, 38);

      let startY = 50;

      // Summary section
      const summary = reportData.summary || {};
      if (Object.keys(summary).length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(26, 18, 69);
        const entries = Object.entries(summary);
        entries.forEach(([key, val]) => {
          doc.text(`${key.replace(/([A-Z])/g, ' $1').trim()}: ${typeof val === 'number' ? val.toLocaleString() : val}`, 14, startY);
          startY += 6;
        });
        startY += 4;
        doc.line(14, startY, 196, startY);
        startY += 6;
      }

      // Table data based on report type
      let columns = [];
      let rows = [];

      const transactions = reportData.transactions || [];
      if (reportType === 'circulation') {
        columns = ['TRX ID', 'Member ID', 'Member', 'Book ID', 'Book', 'Issue Date', 'Due Date', 'Status'];
        rows = transactions.map((t) => {
          const isOverdue = t.status === 'overdue' || (!t.returnDate && new Date(t.dueDate) < new Date());
          const wasReturnedOverdue = t.returnDate && t.overdueDays > 0;
          const daysOverdue = isOverdue
            ? Math.floor((Date.now() - new Date(t.dueDate)) / 86400000)
            : (wasReturnedOverdue ? t.overdueDays : 0);

          let statusText = t.status;
          if (isOverdue) statusText = `Overdue (${daysOverdue}d)`;
          else if (wasReturnedOverdue) statusText = `Returned (Overdue ${daysOverdue}d)`;
          else if (t.status === 'returned') statusText = 'Returned';
          else statusText = 'Active';

          return [
            t.transactionId || '—',
            t.user?.memberId || '—',
            shapeSinhala(t.user?.name || '—'),
            t.book?.bookId || '—',
            shapeSinhala(t.book?.title || '—'),
            new Date(t.issueDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
            new Date(t.dueDate).toLocaleDateString(),
            statusText,
          ];
        });
      }

      const members = reportData.members || [];
      if (reportType === 'members') {
        columns = ['Member ID', 'Name', 'Email', 'Role', 'Grade', 'Active Borrows', 'Total Borrows'];
        rows = members.map((m) => [m.memberId, shapeSinhala(m.name), m.email, m.role, m.grade || '—', m.activeBorrows?.toString() || '0', m.totalBorrows?.toString() || '0']);
      }

      const popular = reportData.popular || [];
      if (reportType === 'popular-books') {
        columns = ['#', 'Book ID', 'Title', 'Author', 'Times Borrowed'];
        rows = popular.map((p, i) => [(i + 1).toString(), p.book?.bookId || '', shapeSinhala(p.book?.title || ''), shapeSinhala(p.book?.author || ''), (p.count || 0).toString()]);
      }

      const fineList = reportData.fines || [];
      if (reportType === 'fines') {
        columns = ['Transaction', 'Member ID', 'Member', 'Book ID', 'Book', 'Amount (LKR)', 'Status', 'Date'];
        rows = fineList.map((f) => [
          f.transaction?.transactionId || '',
          f.user?.memberId || '',
          shapeSinhala(f.user?.name || ''),
          f.book?.bookId || '',
          shapeSinhala(f.book?.title || ''),
          (f.amount || 0).toFixed(2),
          f.status,
          new Date(f.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
        ]);
      }

      if (rows.length > 0) {
        autoTable(doc, {
          startY,
          head: [columns],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: [26, 18, 69], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { left: 14, right: 14 },
          styles: { cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.5 },
          didParseCell: (data) => {
            if (data.cell && data.cell.text) {
              const val = data.cell.text.join(' ');
              const hasSinhala = /[\u0D80-\u0DFF]/.test(val);
              if (hasSinhala) {
                data.cell.styles.font = 'NotoSansSinhala';
                data.cell.styles.fontStyle = 'normal';
              }
            }
          }
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No data available for this report.', 14, startY);
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount} — Kawudulla Maha Vidyalaya Library`, 14, doc.internal.pageSize.height - 10);
      }

      const fileName = `report-${reportType}-${new Date().toISOString().split('T')[0]}`;
      doc.save(`${fileName}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Failed to generate PDF: ' + err.message, 'error');
    }
    setPdfGenerating(false);
  };

  // Excel Generation
  const generateExcel = async () => {
    if (!reportData) { showToast('Please generate a report first before exporting to Excel.', 'error'); return; }
    setExcelGenerating(true);
    try {
      let columns = [];
      let rows = [];

      const transactions = reportData.transactions || [];
      if (reportType === 'circulation') {
        columns = ['TRX ID', 'Member ID', 'Member Name', 'Book ID', 'Book Title', 'Issue Date', 'Due Date', 'Status'];
        rows = transactions.map((t) => {
          const isOverdue = t.status === 'overdue' || (!t.returnDate && new Date(t.dueDate) < new Date());
          const wasReturnedOverdue = t.returnDate && t.overdueDays > 0;
          const daysOverdue = isOverdue
            ? Math.floor((Date.now() - new Date(t.dueDate)) / 86400000)
            : (wasReturnedOverdue ? t.overdueDays : 0);

          let statusText = t.status;
          if (isOverdue) statusText = `Overdue (${daysOverdue}d)`;
          else if (wasReturnedOverdue) statusText = `Returned (Overdue ${daysOverdue}d)`;
          else if (t.status === 'returned') statusText = 'Returned';
          else statusText = 'Active';

          return [
            t.transactionId || '—',
            t.user?.memberId || '—',
            t.user?.name || '—',
            t.book?.bookId || '—',
            t.book?.title || '—',
            new Date(t.issueDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
            new Date(t.dueDate).toLocaleDateString(),
            statusText,
          ];
        });
      }

      const members = reportData.members || [];
      if (reportType === 'members') {
        columns = ['Member ID', 'Name', 'Email', 'Role', 'Grade', 'Active Borrows', 'Total Borrows'];
        rows = members.map((m) => [
          m.memberId || '—',
          m.name || '—',
          m.email || '—',
          m.role || '—',
          m.grade || '—',
          m.activeBorrows || 0,
          m.totalBorrows || 0
        ]);
      }

      const popular = reportData.popular || [];
      if (reportType === 'popular-books') {
        columns = ['Rank', 'Book ID', 'Title', 'Author', 'Times Borrowed'];
        rows = popular.map((p, i) => [
          i + 1,
          p.book?.bookId || '—',
          p.book?.title || '—',
          p.book?.author || '—',
          p.count || 0
        ]);
      }

      const fineList = reportData.fines || [];
      if (reportType === 'fines') {
        columns = ['Transaction ID', 'Member ID', 'Member Name', 'Book ID', 'Book Title', 'Amount (LKR)', 'Status', 'Date'];
        rows = fineList.map((f) => [
          f.transaction?.transactionId || '—',
          f.user?.memberId || '—',
          f.user?.name || '—',
          f.book?.bookId || '—',
          f.book?.title || '—',
          f.amount || 0,
          f.status || '—',
          new Date(f.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
        ]);
      }

      if (rows.length === 0) {
        showToast('No data available to export.', 'error');
        setExcelGenerating(false);
        return;
      }

      // Build Sheet Data Array with Title, Subtitle, Period and Summary Metrics at the top
      const sheetData = [];

      // Title & Header Information
      sheetData.push(["Kawudulla Maha Vidyalaya Library"]);
      sheetData.push([`${reportType.charAt(0).toUpperCase() + reportType.slice(1).replace('-', ' ')} Report`]);
      
      const rangeStr = dateRange.startDate ? `${dateRange.startDate} to ${dateRange.endDate || 'Now'}` : 'All Time';
      const now = new Date().toLocaleDateString();
      sheetData.push([`Period: ${rangeStr} | Generated: ${now}`]);

      // Summary Metrics from reportData
      const summary = reportData.summary || {};
      Object.entries(summary).forEach(([key, val]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
        sheetData.push([`${formattedKey}: ${val}`]);
      });

      // Blank line spacer
      sheetData.push([]);

      // Record the starting row index of the table (0-indexed)
      const tableStartRow = sheetData.length;

      // Add columns header and rows
      sheetData.push(columns);
      rows.forEach(row => sheetData.push(row));

      // Create Workbook and Worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Auto-fit column widths (only scan from the table header downwards to avoid title length distortion)
      const colWidths = columns.map((colName, cIndex) => {
        let maxLen = colName.toString().length;
        rows.forEach((row) => {
          const val = row[cIndex];
          if (val !== undefined && val !== null) {
            const valStr = val.toString();
            const hasSinhala = /[\u0D80-\u0DFF]/.test(valStr);
            const stringLen = valStr.length;
            const weightedLen = hasSinhala ? Math.ceil(stringLen * 1.3) : stringLen;
            if (weightedLen > maxLen) {
              maxLen = weightedLen;
            }
          }
        });
        return { wch: Math.max(maxLen + 4, 12) }; // Minimum width of 12 and padding of 4
      });
      ws['!cols'] = colWidths;

      // Style Header, Metadata, Summary and Cells
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) continue;

          // 1. Style Header Metadata & Summaries at the top
          if (R < tableStartRow) {
            if (C === 0) {
              if (R === 0) {
                // Title
                ws[cellRef].s = {
                  font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "1A1245" } },
                  alignment: { vertical: "center", horizontal: "left" }
                };
              } else if (R === 1) {
                // Subtitle
                ws[cellRef].s = {
                  font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "1A1245" } },
                  alignment: { vertical: "center", horizontal: "left" }
                };
              } else if (R === 2) {
                // Period Date info
                ws[cellRef].s = {
                  font: { name: "Calibri", sz: 9, italic: true, color: { rgb: "595C5E" } },
                  alignment: { vertical: "center", horizontal: "left" }
                };
              } else if (R < tableStartRow - 1) {
                // Summary metrics
                ws[cellRef].s = {
                  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "1A1245" } },
                  alignment: { vertical: "center", horizontal: "left" }
                };
              }
            }
            continue;
          }

          // 2. Style Table Header
          if (R === tableStartRow) {
            ws[cellRef].s = {
              fill: { fgColor: { rgb: "1A1245" } }, // Dark violet background
              font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
              alignment: { vertical: "center", horizontal: "center", wrapText: true },
              border: {
                bottom: { style: "medium", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "E0E0E0" } }
              }
            };
          } 
          // 3. Style Table Body Data Cells
          else {
            let alignHoriz = 'left';
            const val = ws[cellRef].v;
            if (typeof val === 'number') {
              alignHoriz = 'center';
            } else if (typeof val === 'string' && (val === 'Active' || val === 'Returned' || val.startsWith('Overdue') || val.startsWith('Returned (Overdue'))) {
              alignHoriz = 'center';
            }

            ws[cellRef].s = {
              font: { name: "Calibri", sz: 10 },
              alignment: { vertical: "center", horizontal: alignHoriz },
              border: {
                bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                right: { style: "thin", color: { rgb: "E5E7EB" } }
              }
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Report Data");
      const reportName = `report-${reportType}-${new Date().toISOString().split('T')[0]}`;
      XLSX.writeFile(wb, `${reportName}.xlsx`);
      showToast('Excel report generated successfully!', 'success');
    } catch (err) {
      console.error('Excel generation error:', err);
      showToast('Failed to generate Excel report.', 'error');
    } finally {
      setExcelGenerating(false);
    }
  };

  const renderBody = () => {
    if (!reportData) return null;
    return (
      <>
        <ReportSummaryCards reportType={reportType} reportData={reportData} />
        <ReportDetailsTable reportType={reportType} reportData={reportData} />
      </>
    );
  };

  return (
    <DashboardLayout>
          <div className="flex items-center justify-end gap-3 mb-4">
            <button onClick={generatePDF} disabled={!reportData || pdfGenerating || excelGenerating} className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: !reportData || pdfGenerating || excelGenerating ? 0.5 : 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{pdfGenerating ? 'progress_activity' : 'picture_as_pdf'}</span>
              {pdfGenerating ? 'Generating PDF...' : 'Print PDF'}
            </button>
            <button onClick={generateExcel} disabled={!reportData || pdfGenerating || excelGenerating} className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-white shadow-sm hover:shadow transition-all" style={{ backgroundColor: '#15803d', opacity: !reportData || pdfGenerating || excelGenerating ? 0.5 : 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{excelGenerating ? 'progress_activity' : 'table_view'}</span>
              {excelGenerating ? 'Generating Excel...' : 'Export Excel'}
            </button>
          </div>

          {/* Report Type Tabs */}
          <div className="flex gap-2 mb-4">
            {REPORT_TYPES.map((rt) => (
              <button key={rt.id} onClick={() => setReportType(rt.id)} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2" style={{ backgroundColor: reportType === rt.id ? '#1a1245' : '#fff', color: reportType === rt.id ? '#fff' : '#2C2C3E', border: `1px solid ${reportType === rt.id ? '#1a1245' : '#e0e0e0'}` }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{rt.icon}</span> {rt.label}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex gap-3 mb-4 items-center">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>From</label>
              <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#595c5e' }}>To</label>
              <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} />
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p.id)} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', color: '#2C2C3E' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f0f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={fetchReport} disabled={loading} className="px-6 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#4062BB', color: '#fff', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>

          {/* Report Body */}
          {loading ? (
            <div className="flex items-center justify-center py-20" style={{ color: '#94a3b8' }}>
              <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 28 }}>progress_activity</span>Generating report...
            </div>
          ) : (
            renderBody()
          )}

      {toast && (
        <div className="fixed top-3 left-0 lg:left-64 right-0 z-[9999] flex justify-center pointer-events-none">
          <style>{`
            @keyframes toast-enter {
              from { transform: translateY(-15px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            .toast-popup {
              animation: toast-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className={`toast-popup pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-xl text-white shadow-lg border ${
            toast.type === 'error'
              ? 'bg-amber-600 border-amber-500/50'
              : toast.type === 'delete' 
                ? 'bg-rose-600 border-rose-500/50' 
                : 'bg-emerald-600 border-emerald-500/50'
          }`}>
            <span className="material-symbols-outlined text-white font-bold" style={{ fontSize: 18 }}>
              {toast.type === 'error' ? 'warning' : toast.type === 'delete' ? 'delete_forever' : 'check_circle'}
            </span>
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
