
export interface MedicationEntry {
  medicine: string;
  dosage: string;
}

export type RecordType = 'treatment' | 'death';

export interface CattleRecord {
  id: string;
  animalNumber: string;
  date: string;
  corral: string;
  diseases: string[];
  medications: MedicationEntry[];
  timestamp: number;
  registeredBy: string;
  synced: boolean;
  type: RecordType; // 'treatment' ou 'death'
}

export interface DiseaseOption {
  label: string;
  value: string;
}

export interface MedicineOption {
  label: string;
  value: string;
}

export interface CorralOption {
  label: string;
  value: string;
}

export interface Treatment {
  id: string;
  diseaseLabel: string;
  medicines: string[];
}

export type UserRole = 'manager' | 'operator';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}
