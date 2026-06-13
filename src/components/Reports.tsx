import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileBarChart, Users, DoorOpen, CreditCard, MessageSquareWarning, Download } from 'lucide-react';

interface ReportData {
  studentsByDept: { department: string; count: number }[];
  studentsByStatus: { status: string; count: number }[];
  roomsByBlock: { block: string; total: number; available: number; occupied: number; maintenance: number }[];
  feesByType: { fee_type: string; total: number; paid: number; pending: number; overdue: number }[];
  complaintsByCategory: { category: string; count: number }[];
  complaintsByPriority: { priority: string; count: number }[];
  monthlyFees: { month: string; collected: number; pending: number }[];
}

export default function Reports() {
  const [data, setData] = useState<ReportData>({
    studentsByDept: [], studentsByStatus: [], roomsByBlock: [],
    feesByType: [], complaintsByCategory: [], complaintsByPriority: [], monthlyFees: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const [stuRes, roomRes, feeRes, compRes] = await Promise.all([
      supabase.from('students').select('department, status'),
      supabase.from('rooms').select('block, status'),
      supabase.from('fees').select('fee_type, amount, status, paid_date, due_date'),
      supabase.from('complaints').select('category, priority'),
    ]);

    const students = stuRes.data ?? [];
    const rooms = roomRes.data ?? [];
    const fees = feeRes.data ?? [];
    const complaints = compRes.data ?? [];

    // Students by department
    const deptMap = new Map<string, number>();
    students.forEach(s => { deptMap.set(s.department, (deptMap.get(s.department) ?? 0) + 1); });
    const studentsByDept = Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    // Students by status
    const statusMap = new Map<string, number>();
    students.forEach(s => { statusMap.set(s.status, (statusMap.get(s.status) ?? 0) + 1); });
    const studentsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    // Rooms by block
    const blockMap = new Map<string, { total: number; available: number; occupied: number; maintenance: number }>();
    rooms.forEach(r => {
      const cur = blockMap.get(r.block) ?? { total: 0, available: 0, occupied: 0, maintenance: 0 };
      cur.total++;
      if (r.status === 'available') cur.available++;
      else if (r.status === 'occupied') cur.occupied++;
      else cur.maintenance++;
      blockMap.set(r.block, cur);
    });
    const roomsByBlock = Array.from(blockMap.entries()).map(([block, d]) => ({ block, ...d }));

    // Fees by type
    const feeTypeMap = new Map<string, { total: number; paid: number; pending: number; overdue: number }>();
    fees.forEach(f => {
      const cur = feeTypeMap.get(f.fee_type) ?? { total: 0, paid: 0, pending: 0, overdue: 0 };
      cur.total += Number(f.amount);
      if (f.status === 'paid') cur.paid += Number(f.amount);
      else if (f.status === 'pending') cur.pending += Number(f.amount);
      else if (f.status === 'overdue') cur.overdue += Number(f.amount);
      feeTypeMap.set(f.fee_type, cur);
    });
    const feesByType = Array.from(feeTypeMap.entries()).map(([fee_type, d]) => ({ fee_type, ...d }));

    // Complaints by category
    const catMap = new Map<string, number>();
    complaints.forEach(c => { catMap.set(c.category, (catMap.get(c.category) ?? 0) + 1); });
    const complaintsByCategory = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Complaints by priority
    const priMap = new Map<string, number>();
    complaints.forEach(c => { priMap.set(c.priority, (priMap.get(c.priority) ?? 0) + 1); });
    const complaintsByPriority = Array.from(priMap.entries()).map(([priority, count]) => ({ priority, count }));

    // Monthly fees (last 6 months)
    const monthMap = new Map<string, { collected: number; pending: number }>();
    fees.forEach(f => {
      const date = f.paid_date ?? f.due_date;
      if (!date) return;
      const month = date.substring(0, 7);
      const cur = monthMap.get(month) ?? { collected: 0, pending: 0 };
      if (f.status === 'paid') cur.collected += Number(f.amount);
      else cur.pending += Number(f.amount);
      monthMap.set(month, cur);
    });
    const monthlyFees = Array.from(monthMap.entries())
      .map(([month, d]) => ({ month, ...d }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    setData({ studentsByDept, studentsByStatus, roomsByBlock, feesByType, complaintsByCategory, complaintsByPriority, monthlyFees });
    setLoading(false);
  };

  const exportCSV = (headers: string[], rows: string[][], filename: string) => {
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" /></div>;
  }

  const maxDeptCount = Math.max(...data.studentsByDept.map(d => d.count), 1);
  const maxCatCount = Math.max(...data.complaintsByCategory.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Analytics and insights across all modules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by Department */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-teal-600" /></div>
              <h3 className="font-semibold text-slate-900">Students by Department</h3>
            </div>
            <button onClick={() => exportCSV(
              ['Department', 'Count'],
              data.studentsByDept.map(d => [d.department, d.count.toString()]),
              'students_by_department'
            )} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
          </div>
          {data.studentsByDept.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {data.studentsByDept.map(d => (
                <div key={d.department}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{d.department}</span>
                    <span className="font-medium text-slate-700">{d.count}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${(d.count / maxDeptCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students by Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-emerald-600" /></div>
            <h3 className="font-semibold text-slate-900">Students by Status</h3>
          </div>
          {data.studentsByStatus.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No data available</p>
          ) : (
            <div className="flex items-center justify-center gap-8 py-4">
              {data.studentsByStatus.map(s => {
                const total = data.studentsByStatus.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.status} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                          strokeDasharray={`${pct} ${100 - pct}`} className={s.status === 'active' ? 'text-teal-500' : s.status === 'graduated' ? 'text-emerald-500' : 'text-slate-400'} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">{pct}%</div>
                    </div>
                    <div className="text-sm font-medium text-slate-600 capitalize">{s.status}</div>
                    <div className="text-xs text-slate-400">{s.count} students</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rooms by Block */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center"><DoorOpen className="w-5 h-5 text-cyan-600" /></div>
              <h3 className="font-semibold text-slate-900">Rooms by Block</h3>
            </div>
            <button onClick={() => exportCSV(
              ['Block', 'Total', 'Available', 'Occupied', 'Maintenance'],
              data.roomsByBlock.map(d => [d.block, d.total.toString(), d.available.toString(), d.occupied.toString(), d.maintenance.toString()]),
              'rooms_by_block'
            )} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
          </div>
          {data.roomsByBlock.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-medium">Block</th>
                    <th className="text-center py-2 text-slate-500 font-medium">Total</th>
                    <th className="text-center py-2 text-teal-600 font-medium">Available</th>
                    <th className="text-center py-2 text-emerald-600 font-medium">Occupied</th>
                    <th className="text-center py-2 text-amber-600 font-medium">Maint.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.roomsByBlock.map(b => (
                    <tr key={b.block}>
                      <td className="py-2.5 font-medium text-slate-900">Block {b.block}</td>
                      <td className="py-2.5 text-center text-slate-600">{b.total}</td>
                      <td className="py-2.5 text-center text-teal-600 font-medium">{b.available}</td>
                      <td className="py-2.5 text-center text-emerald-600 font-medium">{b.occupied}</td>
                      <td className="py-2.5 text-center text-amber-600 font-medium">{b.maintenance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fee Collection by Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-amber-600" /></div>
              <h3 className="font-semibold text-slate-900">Fee Collection by Type</h3>
            </div>
            <button onClick={() => exportCSV(
              ['Fee Type', 'Total', 'Paid', 'Pending', 'Overdue'],
              data.feesByType.map(d => [d.fee_type, d.total.toString(), d.paid.toString(), d.pending.toString(), d.overdue.toString()]),
              'fees_by_type'
            )} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
          </div>
          {data.feesByType.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No data available</p>
          ) : (
            <div className="space-y-4">
              {data.feesByType.map(f => {
                const maxAmount = Math.max(...data.feesByType.map(x => x.total), 1);
                return (
                  <div key={f.fee_type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 capitalize">{f.fee_type.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-slate-700">PKR{f.total.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      {f.paid > 0 && <div className="h-full bg-teal-500" style={{ width: `${(f.paid / maxAmount) * 100}%` }} />}
                      {f.pending > 0 && <div className="h-full bg-amber-500" style={{ width: `${(f.pending / maxAmount) * 100}%` }} />}
                      {f.overdue > 0 && <div className="h-full bg-red-500" style={{ width: `${(f.overdue / maxAmount) * 100}%` }} />}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Paid: PKR{f.paid.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending: PKR{f.pending.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Overdue: PKR{f.overdue.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Complaints by Category */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><MessageSquareWarning className="w-5 h-5 text-red-600" /></div>
            <h3 className="font-semibold text-slate-900">Complaints by Category</h3>
          </div>
          {data.complaintsByCategory.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {data.complaintsByCategory.map(c => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 capitalize">{c.category}</span>
                    <span className="font-medium text-slate-700">{c.count}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${(c.count / maxCatCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Fee Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><FileBarChart className="w-5 h-5 text-indigo-600" /></div>
            <h3 className="font-semibold text-slate-900">Monthly Fee Trend</h3>
          </div>
          {data.monthlyFees.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No data available</p>
          ) : (
            <div className="space-y-4">
              {data.monthlyFees.map(m => {
                const maxVal = Math.max(...data.monthlyFees.map(x => x.collected + x.pending), 1);
                return (
                  <div key={m.month}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{m.month}</span>
                      <span className="font-medium text-slate-700">PKR{(m.collected + m.pending).toLocaleString()}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      {m.collected > 0 && <div className="h-full bg-teal-500" style={{ width: `${(m.collected / maxVal) * 100}%` }} />}
                      {m.pending > 0 && <div className="h-full bg-amber-500" style={{ width: `${(m.pending / maxVal) * 100}%` }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
