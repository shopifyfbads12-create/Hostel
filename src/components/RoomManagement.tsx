import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Room } from '../types';
import { Search, Plus, Edit2, Trash2, X, DoorOpen, Wrench, CheckCircle2 } from 'lucide-react';

const emptyRoom: { room_number: string; floor: number; block: string; capacity: number; occupied: number; room_type: Room['room_type']; status: Room['status'] } = {
  room_number: '', floor: 1, block: 'A', capacity: 2, occupied: 0, room_type: 'double', status: 'available',
};

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyRoom);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_number');
    setRooms(data ?? []);
    setLoading(false);
  };

  const filtered = rooms.filter(r =>
    r.room_number.toLowerCase().includes(search.toLowerCase()) ||
    r.block.toLowerCase().includes(search.toLowerCase()) ||
    r.room_type.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm(emptyRoom); setError(null); setShowModal(true); };
  const openEdit = (r: Room) => {
    setEditing(r);
    setForm({ room_number: r.room_number, floor: r.floor, block: r.block, capacity: r.capacity, occupied: r.occupied, room_type: r.room_type, status: r.status });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (editing) {
      const { error } = await supabase.from('rooms').update(form).eq('id', editing.id);
      if (error) { setError(error.message); setSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('rooms').insert([form]);
      if (error) { setError(error.message); setSubmitting(false); return; }
    }

    setShowModal(false);
    setSubmitting(false);
    loadRooms();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room?')) return;
    await supabase.from('rooms').delete().eq('id', id);
    loadRooms();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { classes: string; icon: React.ElementType }> = {
      available: { classes: 'bg-teal-100 text-teal-700', icon: CheckCircle2 },
      occupied: { classes: 'bg-emerald-100 text-emerald-700', icon: DoorOpen },
      maintenance: { classes: 'bg-amber-100 text-amber-700', icon: Wrench },
    };
    const s = map[status] ?? map.available;
    const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.classes}`}><Icon className="w-3.5 h-3.5" />{status}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
          <p className="text-slate-500 mt-1">{rooms.length} rooms registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors">
          <Plus className="w-5 h-5" /> Add Room
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" placeholder="Search by room number, block, or type..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">No rooms found</div>
        ) : filtered.map(r => (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-lg font-bold text-slate-900">Room {r.room_number}</div>
                <div className="text-sm text-slate-500">Block {r.block} &middot; Floor {r.floor}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase">{r.room_type}</span>
              {statusBadge(r.status)}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Occupancy</span>
              <span className={`font-medium ${r.occupied >= r.capacity ? 'text-red-600' : 'text-slate-700'}`}>
                {r.occupied}/{r.capacity}
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${
                r.occupied >= r.capacity ? 'bg-red-500' : r.occupied > 0 ? 'bg-teal-500' : 'bg-slate-300'
              }`} style={{ width: `${r.capacity > 0 ? (r.occupied / r.capacity) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Room' : 'Add Room'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
                  <input required value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Block</label>
                  <select value={form.block} onChange={e => setForm({ ...form, block: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['A', 'B', 'C', 'D', 'E'].map(b => <option key={b} value={b}>Block {b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Floor</label>
                  <input type="number" min={0} max={10} required value={form.floor} onChange={e => setForm({ ...form, floor: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room Type</label>
                  <select value={form.room_type} onChange={e => setForm({ ...form, room_type: e.target.value as any })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                    <option value="dormitory">Dormitory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                  <input type="number" min={1} max={20} required value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-xl transition-colors">
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
