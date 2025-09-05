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
