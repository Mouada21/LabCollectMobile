export enum SampleStatus {
  PLANNED = "PLANNED",
  IN_PROGRESS = "IN_PROGRESS",
  COLLECTED = "COLLECTED",
  IN_LAB = "IN_LAB",
  ANALYZED = "ANALYZED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export interface Client {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Signature {
  signedBy: string;
  signedAt: string;
  signatureImageUrl: string;
}

export interface GPSCoordinates {
  latitude: string;
  longitude: string;
  accuracy?: string;
}

export interface ProductData {
  id?: string; // Generated locally until synced
  productName: string;
  category: string;
  clientReference: string;
  requestedAnalyses: string[];
  storageTemperature?: string;
  storageCondition?: string;
  containerType?: string;
  photoUrl?: string;
  images?: {
    imageUrl: string;
    caption?: string;
  }[];
  gpsCoordinates?: {
    latitude: string;
    longitude: string;
    accuracy: string;
  };
  remarks?: string;
}

export interface SampledData {
  products: ProductData[];  // Array of products instead of single product fields
  samplingDateTime: string;
  storageTemperature?: string;
  storageCondition?: string;
  containerType?: string;  // Keep for backward compatibility
  barcode?: string;        // Keep for backward compatibility
  photoUrl?: string;       // Keep for backward compatibility
  requestedAnalyses?: string[]; // Keep for backward compatibility
  gpsCoordinates?: {
    latitude: string;
    longitude: string;
    accuracy?: string;
  };
  remarks?: string;
  signature?: {
    signedBy: string;
    signedAt: string;
    signatureImageUrl: string;
  };
}

export interface Sample {
  id: string;
  sampleCode: string;
  client: {
    id: string;
    name: string;
    description?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  sampler: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    email: string;
    active: boolean;
    fullName: string;
  };
  missionDate: string;
  status: SampleStatus;
  sampledData: any | null;
  results: any[];
  createdAt: string;
  updatedAt: string | null;
}

export interface DashboardData {
  totalSamples: number;
  pendingCollection: number;
  collected: number;
  inProgress: number;
  inLab: number;
  recentActivity: RecentActivity[];
}

export interface RecentActivity {
  sampleId: string;
  sampleCode: string;
  status: SampleStatus;
  timestamp: string;
  client: string;
}

const SampleModels = {
  SampleStatus,
  // Include other exported types/interfaces
};
export default SampleModels;