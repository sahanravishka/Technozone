'use client';

type Row = { order_number: string; status: string; total: number; created_at: string };

export default function DashboardExport({ orders, rangeLabel }: { orders: Row[]; rangeLabel: string }) {
  const download = () => {
    const header = ['Order #', 'Status', 'Total (LKR)', 'Date'];
    const lines = orders.map(o => [
      o.order_number, o.status, String(o.total), new Date(o.created_at).toISOString()
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orders-${rangeLabel}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={download}
      className="pressable rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold hover:bg-paper">
      Export CSV
    </button>
  );
}
