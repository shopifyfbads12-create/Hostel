import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Fee, Student } from '../types';
import { Search, Plus, Edit2, Trash2, X, CreditCard, Banknote } from 'lucide-react';

const emptyFee: { student_id: string; amount: number; fee_type: Fee['fee_type']; due_date: string; paid_date: string; status: Fee['status']; payment_method: NonNullable<Fee['payment_method']>; semester: number; academic_year: string } = {
  student_id: '', amount: 0, fee_type: 'hostel_fee', due_date: '', paid_date: '', status: 'pending', payment_method: 'cash', semester: 1, academic_year: '2025-2026',
};

export default function FeeManagement() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Fee | null>(null);
  const [form, setForm] = useState(emptyFee);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [feeRes, stuRes] = await Promise.all([
      supabase.from('fees').select('*, student:students(id, name, email, department)').order('due_date', { ascending: false }),
      supabase.from('students').select('*').eq('status', 'active'),
    ]);
    setFees(feeRes.data ?? []);
    setStudents(stuRes.data ?? []);
    setLoading(false);
  };

  const filtered = fees.filter(f => {
    const matchSearch = (f.student?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (f.student?.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCollected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0);
  const totalPending = fees.filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0);
  const totalOverdue = fees.filter(f => f.status === 'overdue').reduce((s, f) => s + Number(f.amount), 0);

  const openAdd = () => { setEditing(null); setForm(emptyFee); setError(null); setShowModal(true); };
  const openEdit = (f: Fee) => {
    setEditing(f);
    setForm({
      student_id: f.student_id, amount: Number(f.amount), fee_type: f.fee_type,
      due_date: f.due_date, paid_date: f.paid_date ?? '', status: f.status,
      payment_method: f.payment_method ?? 'cash', semester: f.semester ?? 1, academic_year: f.academic_year ?? '2025-2026',
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      student_id: form.student_id,
      amount: form.amount,
      fee_type: form.fee_type,
      due_date: form.due_date,
      paid_date: form.status === 'paid' ? (form.paid_date || new Date().toISOString().split('T')[0]) : null,
      status: form.status,
      payment_method: form.status === 'paid' ? form.payment_method : null,
      semester: form.semester || null,
      academic_year: form.academic_year || null,
    };

    if (editing) {
      const { error } = await supabase.from('fees').update(payload).eq('id', editing.id);
      if (error) { setError(error.message); setSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('fees').insert([payload]);
      if (error) { setError(error.message); setSubmitting(false); return; }
    }

    setShowModal(false);
    setSubmitting(false);
    loadData();
  };

  const handleMarkPaid = async (f: Fee) => {
    await supabase.from('fees').update({
      status: 'paid', paid_date: new Date().toISOString().split('T')[0], payment_method: 'cash',
    }).eq('id', f.id);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee record?')) return;
    await supabase.from('fees').delete().eq('id', id);
    loadData();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      paid: 'bg-teal-100 text-teal-700',
      overdue: 'bg-red-100 text-red-700',
      partial: 'bg-cyan-100 text-cyan-700',
    };
    return map[status] ?? 'bg-slate-100 text-slate-600';
  };

  const feeTypeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fee Management</h1>
          <p className="text-slate-500 mt-1">{fees.length} fee records</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors">
          <Plus className="w-5 h-5" /> Add Fee
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center"><Banknote className="w-6 h-6 text-teal-600" /></div>
          <div>
            <div className="text-sm text-slate-500">Collected</div>
            <div className="text-xl font-bold text-teal-700">PKR{totalCollected.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6 text-amber-600" /></div>
          <div>
            <div className="text-sm text-slate-500">Pending</div>
            <div className="text-xl font-bold text-amber-700">PKR{totalPending.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6 text-red-600" /></div>
          <div>
            <div className="text-sm text-slate-500">Overdue</div>
            <div className="text-xl font-bold text-red-700">PKR{totalOverdue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Search by student name or email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Type</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No fee records found</td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{f.student?.name ?? 'Unknown'}</div>
                    <div className="text-xs text-slate-400">{f.student?.department}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{feeTypeLabel(f.fee_type)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">PKR{Number(f.amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{f.due_date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(f.status)}`}>{f.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {f.status !== 'paid' && (
                        <button onClick={() => handleMarkPaid(f)} className="px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors">
                          Mark Paid
                        </button>
                      )}
                      <button onClick={() => openEdit(f)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(f.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Fee' : 'Add Fee'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.department}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fee Type</label>
                  <select value={form.fee_type} onChange={e => setForm({ ...form, fee_type: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="hostel_fee">Hostel Fee</option>
                    <option value="mess_fee">Mess Fee</option>
                    <option value="utility_fee">Utility Fee</option>
                    <option value="maintenance_fee">Maintenance Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (PKR)</label>
                  <input type="number" min={0} required value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
                {form.status === 'paid' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Paid Date</label>
                      <input type="date" value={form.paid_date} onChange={e => setForm({ ...form, paid_date: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                      <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                  <input type="number" min={1} max={8} value={form.semester} onChange={e => setForm({ ...form, semester: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                  <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="2025-2026" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-xl transition-colors">
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Add Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
