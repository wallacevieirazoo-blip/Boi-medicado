
export interface MedicationEntry {
  medicine: string;
  dosage: number;
  cost?: number;
}

export type RecordType = 'treatment' | 'death' | 'entry' | 'slaughter' | 'return_to_pasture' | 'butcher';

export interface CattleRecord {
  id: string;
  animalNumber?: string;
  quantity?: number;
  date: string;
  corral: string;
  diseases: string[];
  medications: MedicationEntry[];
  timestamp: number;
  registeredBy: string;
  synced: boolean;
  type: RecordType;
}

export interface DiseaseOption {
  label: string;
  value: string;
}

export interface MedicineOption {
  label: string;
  value: string;
  stockML: number;
  pricePerML: number;
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

export type UserRole = 'super_admin' | 'manager' | 'operator';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  unitId: string;
}

export interface FarmUnit {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  expiresAt: number; // Timestamp de expiração
}

export interface FarmConfig {
  farmName: string;
  unitId: string;
  initialStock?: number;
}
