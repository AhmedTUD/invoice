import { SubmissionRecord, BasicData, InvoiceDraft, JoinedRecord } from '../types';
import { ApiService } from './apiService';

export const MockDB = {
  // Save a new submission using SQLite API
  saveSubmission: async (basicData: BasicData, invoicesDraft: InvoiceDraft[]): Promise<{success: boolean, message?: string}> => {
    return await ApiService.saveSubmission(basicData, invoicesDraft);
  },

  // Get all submissions for Admin Dashboard (deprecated - use getAllJoinedRecords)
  getAllSubmissions: (): SubmissionRecord[] => {
    console.warn('getAllSubmissions is deprecated. Use getAllJoinedRecords instead.');
    return [];
  },

  // Get all Joined Records from SQLite API
  getAllJoinedRecords: async (): Promise<JoinedRecord[]> => {
    return await ApiService.getAllJoinedRecords();
  },

  // Get full details for a specific submission (not implemented in new API)
  getSubmissionDetails: (): null => {
    console.warn('getSubmissionDetails is not implemented in SQLite version');
    return null;
  },

  // Clear all data using SQLite API
  clearData: async (): Promise<{success: boolean, message?: string}> => {
    return await ApiService.clearData();
  },

  // Generate test data using SQLite API
  generateTestData: async (): Promise<{success: boolean, message?: string}> => {
    return await ApiService.generateTestData();
  }
};