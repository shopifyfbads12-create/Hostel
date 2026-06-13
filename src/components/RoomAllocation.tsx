import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Allocation, Student, Room } from '../types';
import { Search, Plus, Edit2, Trash2, X, BedDouble, LogOut } from 'lucide-react';

export default function RoomAllocation() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [form, setForm] = useState<{ student_id: string; room_id: string; check_in: string; check_out: string; status: Allocation['status'] }>({ student_id: '', room_id: '', check_in: new Date().toISOString().split('T')[0], check_out: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [allocRes, stuRes, roomRes] = await Promise.all([
      supabase.from('allocations').select('*, student:students(id, name, email), room:rooms(id, room_number, block, floor)').order('created_at', { ascending: false }),
      supabase.from('students').select('*').eq('status', 'active'),
      supabase.from('rooms').select('*'),
    ]);
    setAllocations(allocRes.data ?? []);
    setStudents(stuRes.data ?? []);
    setRooms(roomRes.data ?? []);
    setLoading(false);
  };

  const filtered = allocations.filter(a =>
    (a.student?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.room?.room_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.room?.block ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const availableRooms = rooms.filter(r => r.status === 'available' || (r.occupied < r.capacity && r.status !== 'maintenance'));

  const openAdd = () => {
    setEditing(null);
    setForm({ student_id: '', room_id: '', check_in: new Date().toISOString().split('T')[0], check_out: '', status: 'active' });
    setError(null);
    setShowModal(true);
  };

  const openEdit = (a: Allocation) => {
    setEditing(a);
    setForm({ student_id: a.student_id, room_id: a.room_id, check_in: a.check_in, check_out: a.check_out ?? '', status: a.status });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      student_id: form.student_id,
      room_id: form.room_id,
      check_in: form.check_in,
      check_out: form.check_out || null,
      status: form.status,
    };

    if (editing) {
      const { error } = await supabase.from('allocations').update(payload).eq('id', editing.id);
      if (error) { setError(error.message); setSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('allocations').insert([payload]);
      if (error) { setError(error.message); setSubmitting(false); return; }
      // Update room occupancy
      const room = rooms.find(r => r.id === form.room_id);
      if (room) {
        const newOccupied = room.occupied + 1;
        const newStatus = newOccupied >= room.capacity ? 'occupied' : room.status;
        await supabase.from('rooms').update({ occupied: newOccupied, status: newStatus }).eq('id', form.room_id);
      }
    }

    setShowModal(false);
    setSubmitting(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this allocation?')) return;
    const alloc = allocations.find(a => a.id === id);
    await supabase.from('allocations').delete().eq('id', id);
    // Decrease room occupancy
    if (alloc) {
      const room = rooms.find(r => r.id === alloc.room_id);
      if (room && room.occupied > 0) {
        const newOccupied = room.occupied - 1;
        const newStatus = newOccupied === 0 ? 'available' : room.status;
        await supabase.from('rooms').update({ occupied: newOccupied, status: newStatus }).eq('id', alloc.room_id);
      }
    }
    loadData();
  };

  const handleCheckout = async (a: Allocation) => {
    await supabase.from('allocations').update({ status: 'completed', check_out: new Date().toISOString().split('T')[0] }).eq('id', a.id);
    const room = rooms.find(r => r.id === a.room_id);
    if (room && room.occupied > 0) {
      const newOccupied = room.occupied - 1;
      const newStatus = newOccupied === 0 ? 'available' : room.status;
      await supabase.from('rooms').update({ occupied: newOccupied, status: newStatus }).eq('id', a.room_id);
    }
    loadData();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-teal-100 text-teal-700',
      completed: 'bg-slate-100 text-slate-600',
      cancelled: 'bg-red-100 text-red-600',
    };
    return map[status] ?? 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Room Allocations</h1>
          <p className="text-slate-500 mt-1">{allocations.filter(a => a.status === 'active').length} active allocations</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors">
          <Plus className="w-5 h-5" /> New Allocation
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" placeholder="Search by student name or room..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Room</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check In</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check Out</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No allocations found</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold text-sm">
                        {(a.student?.name ?? '?').charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{a.student?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{a.student?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">Block {a.room?.block} - Room {a.room?.room_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.check_in}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.check_out ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(a.status)}`}>{a.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {a.status === 'active' && (
                        <button onClick={() => handleCheckout(a)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Check out">
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(a)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Allocation' : 'New Allocation'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                <select required value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Select room...</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>Block {r.block} - Room {r.room_number} ({r.occupied}/{r.capacity})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Check In</label>
                  <input type="date" required value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Check Out</label>
                  <input type="date" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-xl transition-colors">
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Allocate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
