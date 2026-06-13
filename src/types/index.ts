export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  semester: number;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'graduated';
  emergency_contact?: string;
  created_at: string;
}

export interface Room {
  id: string;
  room_number: string;
  floor: number;
  block: string;
  capacity: number;
  occupied: number;
  room_type: 'single' | 'double' | 'triple' | 'dormitory';
  status: 'available' | 'occupied' | 'maintenance';
  amenities?: string[];
  created_at: string;
}

export interface Allocation {
  id: string;
  student_id: string;
  room_id: string;
  check_in: string;
  check_out?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  student?: Student;
  room?: Room;
}

export interface Fee {
  id: string;
  student_id: string;
  amount: number;
  fee_type: 'hostel_fee' | 'mess_fee' | 'utility_fee' | 'maintenance_fee' | 'other';
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  payment_method?: 'cash' | 'card' | 'upi' | 'bank_transfer';
  semester?: number;
  academic_year?: string;
  created_at: string;
  student?: Student;
}

export interface Complaint {
  id: string;
  student_id: string;
  title: string;
  description: string;
  category: 'maintenance' | 'cleanliness' | 'noise' | 'wifi' | 'food' | 'security' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolved_at?: string;
  created_at: string;
  student?: Student;
}

export type Page = 'dashboard' | 'students' | 'rooms' | 'allocations' | 'fees' | 'complaints' | 'reports';
