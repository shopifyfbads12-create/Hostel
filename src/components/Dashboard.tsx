import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, DoorOpen, CreditCard, MessageSquareWarning, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  totalFees: number;
  paidFees: number;
  pendingFees: number;
  overdueFees: number;
  openComplaints: number;
  resolvedComplaints: number;
  totalAllocations: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0, activeStudents: 0, totalRooms: 0, availableRooms: 0,
    occupiedRooms: 0, totalFees: 0, paidFees: 0, pendingFees: 0, overdueFees: 0,
    openComplaints: 0, resolvedComplaints: 0, totalAllocations: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const [studentsRes, roomsRes, feesRes, complaintsRes, allocationsRes] = await Promise.all([
      supabase.from('students').select('id, status', { count: 'exact' }),
      supabase.from('rooms').select('id, status, capacity, occupied'),
      supabase.from('fees').select('id, status, amount'),
      supabase.from('complaints').select('id, status, title, category, priority, created_at, students(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('allocations').select('id', { count: 'exact' }),
    ]);

    const students = studentsRes.data ?? [];
    const rooms = roomsRes.data ?? [];
    const fees = feesRes.data ?? [];
    const complaints = complaintsRes.data ?? [];

    const totalFees = fees.reduce((sum, f) => sum + Number(f.amount), 0);
    const paidFees = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount), 0);
    const pendingFees = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + Number(f.amount), 0);
    const overdueFees = fees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + Number(f.amount), 0);

    setStats({
      totalStudents: studentsRes.count ?? 0,
      activeStudents: students.filter(s => s.status === 'active').length,
      totalRooms: rooms.length,
      availableRooms: rooms.filter(r => r.status === 'available').length,
      occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
      totalFees,
      paidFees,
      pendingFees,
      overdueFees,
      openComplaints: complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length,
      resolvedComplaints: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
      totalAllocations: allocationsRes.count ?? 0,
    });

    setRecentComplaints(complaints);
    setLoading(false);
  };

  const occupancyRate = stats.totalRooms > 0
    ? Math.round(((stats.totalRooms - stats.availableRooms) / stats.totalRooms) * 100)
    : 0;

  const feeCollectionRate = stats.totalFees > 0
    ? Math.round((stats.paidFees / stats.totalFees) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your hostel management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents}
          subtext={`${stats.activeStudents} active`}
          color="teal"
        />
        <StatCard
          icon={DoorOpen}
          label="Room Occupancy"
          value={`${occupancyRate}%`}
          subtext={`${stats.availableRooms} rooms available`}
          color="emerald"
        />
        <StatCard
          icon={CreditCard}
          label="Fee Collection"
          value={`${feeCollectionRate}%`}
          subtext={`PKR${stats.paidFees.toLocaleString()} collected`}
          color="cyan"
        />
        <StatCard
          icon={MessageSquareWarning}
          label="Open Complaints"
          value={stats.openComplaints}
          subtext={`${stats.resolvedComplaints} resolved`}
          color="amber"
        />
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fee Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Fee Summary</h3>
            <CreditCard className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            <FeeBar label="Collected" amount={stats.paidFees} total={stats.totalFees} color="bg-teal-500" />
            <FeeBar label="Pending" amount={stats.pendingFees} total={stats.totalFees} color="bg-amber-500" />
            <FeeBar label="Overdue" amount={stats.overdueFees} total={stats.totalFees} color="bg-red-500" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-semibold text-slate-900">PKR{stats.totalFees.toLocaleString()}</span>
          </div>
        </div>

        {/* Room Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Room Status</h3>
            <DoorOpen className="w-5 h-5 text-slate-400" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-teal-50 rounded-xl">
              <div className="text-2xl font-bold text-teal-700">{stats.availableRooms}</div>
              <div className="text-xs text-teal-600 mt-1">Available</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <div className="text-2xl font-bold text-emerald-700">{stats.occupiedRooms}</div>
              <div className="text-xs text-emerald-600 mt-1">Occupied</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <div className="text-2xl font-bold text-amber-700">{stats.totalRooms - stats.availableRooms - stats.occupiedRooms}</div>
              <div className="text-xs text-amber-600 mt-1">Maintenance</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Capacity</span>
              <span className="font-medium text-slate-700">{stats.totalRooms * 2} beds</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Active Allocations</span>
              <span className="font-medium text-slate-700">{stats.totalAllocations}</span>
            </div>
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Recent Complaints</h3>
            <MessageSquareWarning className="w-5 h-5 text-slate-400" />
          </div>
          {recentComplaints.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No complaints yet</p>
          ) : (
            <div className="space-y-3">
              {recentComplaints.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    c.priority === 'urgent' ? 'bg-red-500' :
                    c.priority === 'high' ? 'bg-amber-500' :
                    c.priority === 'medium' ? 'bg-cyan-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{c.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.students?.name ?? 'Unknown'} &middot; {c.category}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    c.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    c.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="text-sm text-slate-500">Active Allocations</div>
            <div className="text-xl font-bold text-slate-900">{stats.totalAllocations}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm text-slate-500">Resolved Complaints</div>
            <div className="text-xl font-bold text-slate-900">{stats.resolvedComplaints}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="text-sm text-slate-500">Overdue Fees</div>
            <div className="text-xl font-bold text-slate-900">PKR{stats.overdueFees.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ElementType; label: string; value: string | number; subtext: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-100 text-teal-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{subtext}</div>
    </div>
  );
}

function FeeBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-700">PKR{amount.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
