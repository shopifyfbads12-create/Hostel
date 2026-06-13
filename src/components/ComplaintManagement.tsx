import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Complaint, Student } from '../types';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const emptyComplaint: { student_id: string; title: string; description: string; category: Complaint['category']; priority: Complaint['priority']; status: Complaint['status'] } = {
  student_id: '', title: '', description: '', category: 'maintenance', priority: 'medium', status: 'open',
};

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [form, setForm] = useState(emptyComplaint);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [compRes, stuRes] = await Promise.all([
      supabase.from('complaints').select('*, student:students(id, name, email, department)').order('created_at', { ascending: false }),
      supabase.from('students').select('*').eq('status', 'active'),
    ]);
    setComplaints(compRes.data ?? []);
    setStudents(stuRes.data ?? []);
    setLoading(false);
  };

  const filtered = complaints.filter(c => {
    const matchSearch = (c.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.student?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = complaints.filter(c => c.status === 'open').length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  const openAdd = () => { setEditing(null); setForm(emptyComplaint); setError(null); setShowModal(true); };
  const openEdit = (c: Complaint) => {
    setEditing(c);
    setForm({ student_id: c.student_id, title: c.title, description: c.description, category: c.category, priority: c.priority, status: c.status });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      student_id: form.student_id,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      status: form.status,
      resolved_at: (form.status === 'resolved' || form.status === 'closed') ? new Date().toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase.from('complaints').update(payload).eq('id', editing.id);
      if (error) { setError(error.message); setSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('complaints').insert([payload]);
      if (error) { setError(error.message); setSubmitting(false); return; }
    }

    setShowModal(false);
    setSubmitting(false);
    loadData();
  };

  const handleStatusUpdate = async (c: Complaint, newStatus: string) => {
    await supabase.from('complaints').update({
      status: newStatus,
      resolved_at: (newStatus === 'resolved' || newStatus === 'closed') ? new Date().toISOString() : c.resolved_at,
    }).eq('id', c.id);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this complaint?')) return;
    await supabase.from('complaints').delete().eq('id', id);
    loadData();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { classes: string; icon: React.ElementType }> = {
      open: { classes: 'bg-blue-100 text-blue-700', icon: AlertTriangle },
      in_progress: { classes: 'bg-amber-100 text-amber-700', icon: Clock },
      resolved: { classes: 'bg-teal-100 text-teal-700', icon: CheckCircle2 },
      closed: { classes: 'bg-slate-100 text-slate-600', icon: CheckCircle2 },
    };
    const s = map[status] ?? map.open;
    const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.classes}`}><Icon className="w-3.5 h-3.5" />{status.replace('_', ' ')}</span>;
  };

  const priorityDot = (priority: string) => {
    const map: Record<string, string> = { low: 'bg-slate-400', medium: 'bg-cyan-500', high: 'bg-amber-500', urgent: 'bg-red-500' };
    return map[priority] ?? 'bg-slate-400';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
          <p className="text-slate-500 mt-1">{complaints.length} complaints registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors">
          <Plus className="w-5 h-5" /> New Complaint
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-blue-600" /></div>
          <div>
            <div className="text-sm text-slate-500">Open</div>
            <div className="text-xl font-bold text-blue-700">{openCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600" /></div>
          <div>
            <div className="text-sm text-slate-500">In Progress</div>
            <div className="text-xl font-bold text-amber-700">{inProgressCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-teal-600" /></div>
          <div>
            <div className="text-sm text-slate-500">Resolved</div>
            <div className="text-xl font-bold text-teal-700">{resolvedCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Search by title, student, or category..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Complaint Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">No complaints found</div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${priorityDot(c.priority)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span>{c.student?.name ?? 'Unknown'}</span>
                    <span className="capitalize">{c.category}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {c.status === 'open' && (
                  <button onClick={() => handleStatusUpdate(c, 'in_progress')} className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
                    Start
                  </button>
                )}
                {c.status === 'in_progress' && (
                  <button onClick={() => handleStatusUpdate(c, 'resolved')} className="px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors">
                    Resolve
                  </button>
                )}
                <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Complaint' : 'New Complaint'}</h3>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="maintenance">Maintenance</option>
                    <option value="cleanliness">Cleanliness</option>
                    <option value="noise">Noise</option>
                    <option value="wifi">WiFi</option>
                    <option value="food">Food</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-xl transition-colors">
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
