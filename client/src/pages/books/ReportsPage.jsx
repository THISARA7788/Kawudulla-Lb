import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ReportSummaryCards from '../../components/reports/ReportSummaryCards';
import ReportDetailsTable from '../../components/reports/ReportDetailsTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  useEffect(() => { if (user && user.role !== 'librarian') navigate('/dashboard', { replace: true }); }, [user, navigate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { ...dateRange };
      const res = await api.get(`/library/reports/${reportType}`, { params, headers: { Authorization: `Bearer ${token}` } });
      setReportData(res.data);
    } catch (err) { console.error(err); alert('Failed to generate report.'); }
    finally { setLoading(false); }
  };

  const applyPreset = (id) => {
    setDateRange(getRange(id));
  };

  // PDF Generation
  const generatePDF = async () => {
    if (!reportData) { alert('Please generate a report first before downloading PDF.'); return; }
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
            t.user?.name || '—',
            t.book?.bookId || '—',
            t.book?.title || '—',
            new Date(t.issueDate).toLocaleDateString(),
            new Date(t.dueDate).toLocaleDateString(),
            statusText,
          ];
        });
      }

      const members = reportData.members || [];
      if (reportType === 'members') {
        columns = ['Member ID', 'Name', 'Email', 'Role', 'Grade', 'Active Borrows', 'Total Borrows'];
        rows = members.map((m) => [m.memberId, m.name, m.email, m.role, m.grade || '—', m.activeBorrows?.toString() || '0', m.totalBorrows?.toString() || '0']);
      }

      const popular = reportData.popular || [];
      if (reportType === 'popular-books') {
        columns = ['#', 'Book ID', 'Title', 'Author', 'Times Borrowed'];
        rows = popular.map((p, i) => [(i + 1).toString(), p.book?.bookId || '', p.book?.title || '', p.book?.author || '', (p.count || 0).toString()]);
      }

      const fineList = reportData.fines || [];
      if (reportType === 'fines') {
        columns = ['Transaction', 'Member ID', 'Member', 'Book ID', 'Book', 'Amount (LKR)', 'Status', 'Date'];
        rows = fineList.map((f) => [
          f.transaction?.transactionId || '',
          f.user?.memberId || '',
          f.user?.name || '',
          f.book?.bookId || '',
          f.book?.title || '',
          (f.amount || 0).toFixed(2),
          f.status,
          new Date(f.createdAt).toLocaleDateString(),
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
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount} — Kawudulla Maha Vidyalaya Library`, 14, doc.internal.pageSize.height - 10);
      }

      const fileName = `report-${reportType}-${new Date().toISOString().split('T')[0]}`;
      doc.save(`${fileName}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + err.message);
    }
    setPdfGenerating(false);
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
          <div className="flex items-center justify-end mb-4">
            <button onClick={generatePDF} disabled={!reportData || pdfGenerating} className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2" style={{ backgroundColor: '#1a1245', color: '#fff', opacity: !reportData || pdfGenerating ? 0.5 : 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{pdfGenerating ? 'progress_activity' : 'picture_as_pdf'}</span>
              {pdfGenerating ? 'Generating...' : 'Print'}
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
    </DashboardLayout>
  );
}
