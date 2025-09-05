import { type FileError } from 'react-dropzone';


// ===== FILE UPLOAD TYPES =====
export interface FileWithPreview extends File {
  preview?: string;
  errors?: readonly FileError[];
}

export interface FileProcessingState {
  id: string;
  file: FileWithPreview;
  status: 'queued' | 'uploading' | 'transcribing' | 'summarizing' | 'complete' | 'error';
  summaryStatus: string;
  meetingId?: string | null;
  errorMessage?: string;
  meetingAt: Date;
}

// ===== FILE MANAGEMENT TYPES =====
export interface UserFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  url?: string;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface FileUploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (file: UserFile) => void;
  onError?: (error: string) => void;
}

export interface FileManagerState {
  files: UserFile[];
  isLoading: boolean;
  error: string | null;
  uploadProgress: FileUploadProgress[];
}

// ===== HOOK TYPES =====

export type UseSupabaseUploadOptions = {
  bucketName: string;
  path?: string;
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  cacheControl?: number;
  upsert?: boolean;
  onUploadSuccess?: (filePath: string, originalFileName: string) => void;
}
