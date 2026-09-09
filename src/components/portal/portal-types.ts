// Shared portal types
export type PortalUser = {
  id: string;
  phone: string;
  fullName: string;
  bloodGroup?: string | null;
  abhaId?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  state?: string | null;
  dob?: string | null;
  gender?: string | null;
  email?: string | null;
  hospitalPatientUhid?: string | null;
  familyHeadId?: string | null;
  relationToHead?: string | null;
  isOnboarded?: boolean;
  lastLoginAt?: string | null;
};

export type BloodBooking = {
  id: string;
  bookingRef: string;
  testPanelName: string;
  testPanelCode: string;
  testsIncluded: string;
  price: number;
  scheduledDate: string;
  timeSlot: string;
  address: string;
  city: string;
  pincode: string;
  phlebotomistId: string | null;
  phlebotomistName: string | null;
  phlebotomistPhone: string | null;
  status: string;
  sampleCollectedAt: string | null;
  reportReadyAt: string | null;
  reportJson: string | null;
  aiInterpretation: string | null;
  paymentMode: string;
  paymentStatus: string;
  cancellationReason: string | null;
};

export type TestPanel = {
  code: string;
  name: string;
  price: number;
  tests: string;
  icon: string;
  popular?: boolean;
  estTime?: string;
};

export type TimelineEvent = {
  id: string;
  type: "appointment" | "admission" | "vital" | "bill" | "insurance" | "lab" | "blood_booking";
  title: string;
  subtitle: string;
  date: string;
  meta?: Record<string, unknown>;
};

export type AIInsight = {
  severity: "info" | "warning" | "alert";
  title: string;
  description: string;
  icon: string;
};

export type FamilyMember = {
  id: string;
  fullName: string;
  phone: string;
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  relationToHead: string | null;
  abhaId?: string | null;
};

export type DashboardData = {
  user: PortalUser;
  hospitalPatient: unknown;
  stats: Record<string, number>;
  appointments: Appointment[];
  admissions: Admission[];
  vitals: Vitals[];
  bills: Bill[];
  insurance: InsuranceClaim[];
  labReports: LabReport[];
  orders: unknown[];
  bloodBookings: BloodBooking[];
  familyMembers: FamilyMember[];
  timeline: TimelineEvent[];
  aiInsights: AIInsight[];
  fetchedAt: string;
};

export type Appointment = {
  id: string;
  date: string;
  timeSlot: string;
  appointmentType: string;
  status: string;
  chiefComplaint: string | null;
  tokenNumber: number;
  doctor: { id: string; name: string; specialty: string } | null;
};

export type Admission = {
  id: string;
  admissionDate: string;
  admissionType: string;
  admissionDiagnosis: string | null;
  dischargeStatus: string | null;
  ward: { id: string; name: string; wardType: string } | null;
  bed: { id: string; bedNumber: string } | null;
  admittingDoctor: { id: string; name: string } | null;
};

export type Vitals = {
  id: string;
  recordedAt: string;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  pulseRate: number | null;
  temperatureC: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  bloodGlucose: number | null;
  news2Score: number | null;
};

export type Bill = {
  id: string;
  billDate: string;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  totalPayable: number;
  paymentMode: string;
  paymentStatus: string;
  itemizedCharges: string;
};

export type InsuranceClaim = {
  id: string;
  tpaCompany: string;
  policyNumber: string | null;
  estimatedCost: number;
  approvedAmount: number;
  patientCopay: number;
  cashless: boolean;
  preAuthStatus: string;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type LabReport = {
  id: string;
  testName: string;
  resultValue: string | null;
  unit: string | null;
  refRangeMin: number | null;
  refRangeMax: number | null;
  abnormalFlag: string;
  resultText: string | null;
  reportedAt: string | null;
  createdAt: string;
  order: {
    id: string;
    orderType: string;
    orderDetails: string;
    priority: string;
    status: string;
  };
};
