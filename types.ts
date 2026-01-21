export interface BasicData {
  email: string;
  name: string;
  mobile: string;
  serial: string;
  storeName: string;
  storeCode: string;
}

export interface InvoiceDraft {
  id: string; // Temporary ID for UI handling
  model: string;
  salesDate: string;
  file: File | null;
  filePreviewUrl?: string;
}

export interface InvoiceRecord {
  id: string;
  submissionId: string;
  model: string;
  salesDate: string;
  fileName: string;
  fileDataUrl: string; // Base64 for demo purposes
}

export interface SubmissionRecord extends BasicData {
  id: string;
  createdAt: string;
}

export interface FullSubmission extends SubmissionRecord {
  invoices: InvoiceRecord[];
}

// New type for the Admin Table (Flattened row)
export interface JoinedRecord extends BasicData {
  submissionId: string;
  submissionDate: string;
  invoiceId: string;
  model: string;
  category?: string; // فئة الموديل من جدول models
  salesDate: string;
  fileName: string;
  fileDataUrl: string;
}

// Model Management Types
export interface Model {
  id: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}