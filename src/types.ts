export type Role = 'admin' | 'patient_reg' | 'clinic_reg';

export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
  clinicCode: string;
}

export type ClinicType = 'medicine' | 'dermatology' | 'ent' | 'orthopedics' | 'pediatrics';

export interface Patient {
  id: number;
  name_ar: string;
  age_value: number;
  age_unit: 'year' | 'month' | 'week';
  phone?: string;
  national_id?: string;
  ticket_number: number;
  complaint: string;
  chronic_illnesses?: string;
  medications?: string;
  clinic_type: ClinicType;
  status: 'waiting' | 'checked' | 'referred';
  created_at: string;
  vitals_data: any;
  diagnosis?: string;
  decision?: string;
  treatment?: string;
  referral?: string;
  notes?: string;
  doctor_signature?: string;
}
