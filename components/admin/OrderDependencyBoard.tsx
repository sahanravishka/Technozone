'use client';

import { useState, useTransition } from 'react';
import PageHeader from './PageHeader';
import OrderJourneyModal from './OrderJourneyModal';
import OrderDetailModal from './OrderDetailModal';
import { getOrderDependencyReport, type DependencyReportRow } from '@/app/admin/actions';
import { formatLKR } from '@/lib/site';

export default function OrderDependencyBoard({
  initialRows,
}: { initialRows: DependencyReportRow[] }) {
  const [rows, setRows] = useState<DependencyReportRow[]>(initialRows);
  const [pending, start] = useTransition();

  // Date range state
  const defaultEnd = new Date().toISOString().split('T')[0];
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [payFilter, setPayFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const fetchReport = (sDate: string, eDate: string) => {
    start(async () => {
      try {
        const isoStart = sDate ? new Date(`${sDate}T00:00:00.000Z`).toISOString() : undefined;
        const isoEnd = eDate ? new Date(`${eDate}T23:59:59.999Z`).toISOString() : undefined;
        const data = await getOrderDependencyReport(isoStart, isoEnd);
        setRows(data);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error fetching report');
      }
    });
  };

  const applyPreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth') => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (preset === 'today') {
      // s and e are today
    } else if (preset === 'yesterday') {
      s.setDate(now.getDate() - 1);
      e.setDate(now.getDate() - 1);
    } else if (preset === '7days') {
      s.setDate(now.getDate() - 7);
    } else if (preset === '30days') {
      s.setDate(now.getDate() - 30);
    } else if (preset === 'thisMonth') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const sStr = s.toISOString().split('T')[0];
    const eStr = e.toISOString().split('T')[0];
    setStartDate(sStr);
    setEndDate(eStr);
    fetchReport(sStr, eStr);
  };

  // Filtered rows
  const filtered = rows.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (payFilter !== 'all' && r.payment_method !== payFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const serialText = r.serials.map(s => `${s.product_name} ${s.serial_no}`).join(' ').toLowerCase();
      const match =
        r.order_number.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.customer_phone.includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.items_summary.toLowerCase().includes(q) ||
        serialText.includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Summary Metrics
  const totalCount = filtered.length;
  const totalRev = filtered.reduce((n, r) => n + r.total, 0);
  const dispatchedCount = filtered.filter(r => r.status === 'dispatched').length;
  const codCount = filtered.filter(r => r.payment_method === 'cod').length;
  const cancelledCount = filtered.filter(r => r.status === 'cancelled').length;

  // Export CSV
  const exportCSV = () => {
    if (filtered.length === 0) return alert('No records to export');

    const headers = [
      'Order Number',
      'Date Placed',
      'Customer Name',
      'Phone',
      'City',
      'Address',
      'Total (LKR)',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Items Summary',
      'Scanned IMEIs / Serials',
      'Status History Logs'
    ];

    const csvRows = filtered.map(r => {
      const dateStr = new Date(r.created_at).toLocaleString('en-GB');
      const serialsStr = r.serials.map(s => `${s.product_name}: ${s.serial_no}`).join(' | ');
      const historyStr = r.status_history.map(h => `${h.from_status ?? 'NEW'}->${h.to_status} (${new Date(h.created_at).toLocaleString('en-GB')})`).join(' | ');

      return [
        `"${r.order_number}"`,
        `"${dateStr}"`,
        `"${r.customer_name.replace(/"/g, '""')}"`,
        `"${r.customer_phone}"`,
        `"${r.city.replace(/"/g, '""')}"`,
        `"${r.address_line.replace(/"/g, '""')}"`,
        r.total,
        `"${r.payment_method}"`,
        `"${r.payment_status}"`,
        `"${r.status}"`,
        `"${r.items_summary.replace(/"/g, '""')}"`,
        `"${serialsStr.replace(/"/g, '""')}"`,
        `"${historyStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Order_Dependency_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Order Dependency Report"
          subtitle="Complete audit trail & customer journey logs across all order lifecycles"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportCSV}
              className="pressable rounded-xl bg-volt px-4 py-2.5 text-[13px] font-bold text-white hover:bg-volt-deep"
            >
              📥 Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="pressable rounded-xl border border-line bg-card px-4 py-2.5 text-[13px] font-bold text-ink hover:bg-paper"
            >
              🖨 Print Audit Report
            </button>
          </div>
        </PageHeader>

        {/* ── Date Period Selector Controls ── */}
        <div className="mb-5 rounded-3xl border border-line bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <b className="text-[14px]">📅 Select Date Period</b>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => applyPreset('today')} className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold hover:bg-line">Today</button>
              <button onClick={() => applyPreset('yesterday')} className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold hover:bg-line">Yesterday</button>
              <button onClick={() => applyPreset('7days')} className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold hover:bg-line">Last 7 Days</button>
              <button onClick={() => applyPreset('30days')} className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold hover:bg-line">Last 30 Days</button>
              <button onClick={() => applyPreset('thisMonth')} className="pressable rounded-lg bg-paper px-3 py-1.5 text-[12px] font-semibold hover:bg-line">This Month</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-muted">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 rounded-xl border border-line bg-paper px-3 text-[12.5px] font-semibold outline-none focus:ring-2 focus:ring-volt"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-muted">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 rounded-xl border border-line bg-paper px-3 text-[12.5px] font-semibold outline-none focus:ring-2 focus:ring-volt"
              />
            </div>
            <button
              onClick={() => fetchReport(startDate, endDate)}
              disabled={pending}
              className="pressable rounded-xl bg-ink px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
            >
              {pending ? 'Loading…' : 'Apply Range'}
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-line bg-card p-3.5 text-center">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted">Total Orders</p>
            <p className="mt-1 text-[20px] font-black">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-3.5 text-center">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted">Total Revenue</p>
            <p className="mt-1 text-[17px] font-black text-volt-deep">{formatLKR(totalRev)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-3.5 text-center">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted">Dispatched</p>
            <p className="mt-1 text-[20px] font-black text-ok">{dispatchedCount}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-3.5 text-center">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted">COD Orders</p>
            <p className="mt-1 text-[20px] font-black text-amber-600">{codCount}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-3.5 text-center">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted">Cancelled</p>
            <p className="mt-1 text-[20px] font-black text-sale">{cancelledCount}</p>
          </div>
        </div>

        {/* ── Filters & Search ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone, city, items, IMEI..."
            className="h-10 w-full max-w-md rounded-xl border border-line bg-card px-3.5 text-[13px] outline-none focus:ring-2 focus:ring-volt"
          />

          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-line bg-card px-3 font-semibold outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={payFilter}
              onChange={e => setPayFilter(e.target.value)}
              className="h-9 rounded-xl border border-line bg-card px-3 font-semibold outline-none"
            >
              <option value="all">All Payments</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="payhere">Online (PayHere)</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Print Header (visible only when printing) ── */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-black">Technozone — Order Dependency & Lifecycle Audit Report</h1>
        <p className="text-[12px] text-muted">Period: {startDate} to {endDate} · Total Records: {totalCount} · Generated: {new Date().toLocaleString('en-GB')}</p>
      </div>

      {/* ── Dependency Table ── */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line bg-paper/60 text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Placed Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items Summary</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status & Audit Logs</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(r => {
                const isCod = r.payment_method === 'cod';
                const dateStr = new Date(r.created_at).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const statusLabel = isCod && r.status === 'paid' ? 'Confirmed' : r.status;

                return (
                  <tr key={r.id} className="hover:bg-paper/30 align-top">
                    <td className="px-4 py-3.5 font-bold">
                      {r.order_number}
                    </td>
                    <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold block">{r.customer_name}</span>
                      <span className="text-[11.5px] text-muted block">{r.customer_phone}</span>
                      <span className="text-[11.5px] text-muted block">{r.city}</span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <p className="line-clamp-2 text-muted">{r.items_summary}</p>
                      {r.serials.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {r.serials.map((s, idx) => (
                            <span key={idx} className="inline-block rounded bg-ok/10 px-1.5 py-0.5 text-[10px] font-bold text-ok mr-1">
                              S/N: {s.serial_no}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="rounded-lg bg-paper px-2 py-1 text-[11px] font-bold capitalize">
                        {isCod ? 'Cash on delivery' : r.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block rounded-lg px-2.5 py-0.5 text-[11px] font-bold capitalize mb-1.5 ${
                        r.status === 'dispatched' ? 'bg-[#D1FAE5] text-[#065F46]' :
                        r.status === 'cancelled' ? 'bg-sale/10 text-sale' :
                        r.status === 'paid' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-paper text-muted'
                      }`}>
                        {statusLabel}
                      </span>

                      {/* Status history log preview */}
                      <ul className="space-y-1 text-[11px] text-muted border-l border-line pl-2">
                        <li>📌 Placed: {new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</li>
                        {r.status_history.map((h, idx) => (
                          <li key={idx}>
                            ➔ {h.to_status.toUpperCase()} ({new Date(h.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-right whitespace-nowrap">
                      {formatLKR(r.total)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap print:hidden">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setJourneyId(r.id)}
                          className="pressable rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold hover:bg-line"
                        >
                          🗺️ Journey
                        </button>
                        <button
                          onClick={() => setDetailsId(r.id)}
                          className="pressable rounded-lg bg-paper px-2.5 py-1 text-[11.5px] font-semibold hover:bg-line"
                        >
                          👁 Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filtered.length && (
            <div className="p-12 text-center text-muted">
              No orders found for the selected period or filters.
            </div>
          )}
        </div>
      </div>

      {journeyId && <OrderJourneyModal orderId={journeyId} onClose={() => setJourneyId(null)} />}
      {detailsId && <OrderDetailModal orderId={detailsId} onClose={() => setDetailsId(null)} />}
    </div>
  );
}
