'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { UserFile } from '@/types'
import { sanitizeFileName } from '@/lib/utils/filename'

const BUCKET_NAME = 'files'

// uploadFile function moved to API route (/api/storage) to handle large files

export async function getUserFiles(): Promise<{ success: boolean; data?: UserFile[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // List files in user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (listError) {
      return { success: false, error: listError.message }
    }

    // Transform to UserFile format and get public URLs
    const userFiles: UserFile[] = await Promise.all(
      files.map(async (file: { name: string; created_at: string; updated_at: string; metadata?: { size?: number; mimetype?: string; originalName?: string } }) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${user.id}/${file.name}`)

        return {
          id: `${user.id}/${file.name}`,
          name: file.metadata?.originalName || file.name, // Use original name from metadata, fallback to stored name
          path: `${user.id}/${file.name}`,
          size: file.metadata?.size || 0,
          mime_type: file.metadata?.mimetype || 'application/octet-stream',
          created_at: file.created_at,
          updated_at: file.updated_at,
          metadata: file.metadata,
          url: urlData.publicUrl
        }
      })
    )

    return { success: true, data: userFiles }
  } catch (error) {
    console.error('Get files error:', error)
    return { success: false, error: 'Failed to fetch files' }
  }
}

export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify the file belongs to the user
    if (!filePath.startsWith(user.id + '/')) {
      return { success: false, error: 'Unauthorized to delete this file' }
    }

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    revalidatePath('/workspace')
    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

export async function updateFileName(oldPath: string, newName: string): Promise<{ success: boolean; data?: UserFile; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify the file belongs to the user
    if (!oldPath.startsWith(user.id + '/')) {
      return { success: false, error: 'Unauthorized to update this file' }
    }

    // Get the file first
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(oldPath)

    if (downloadError) {
      return { success: false, error: downloadError.message }
    }

    // Create new path with sanitized filename
    const sanitizedNewName = sanitizeFileName(newName)
    const newPath = `${user.id}/${sanitizedNewName}`
    
    // Upload with new name, preserving original filename in metadata
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(newPath, fileData, {
        cacheControl: '3600',
        upsert: true,
        metadata: {
          originalName: newName // Store the new name as the original name
        }
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    // Delete old file
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([oldPath])

    if (deleteError) {
      console.warn('Failed to delete old file:', deleteError.message)
    }

    // Get public URL for new file
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(newPath)

    const userFile: UserFile = {
      id: uploadData.path,
      name: newName,
      path: uploadData.path,
      size: fileData.size,
      mime_type: fileData.type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url: urlData.publicUrl
    }

    revalidatePath('/workspace')
    return { success: true, data: userFile }
  } catch (error) {
    console.error('Update error:', error)
    return { success: false, error: 'Failed to update file' }
  }
}

export async function downloadFile(filePath: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify the file belongs to the user
    if (!filePath.startsWith(user.id + '/')) {
      return { success: false, error: 'Unauthorized to download this file' }
    }

    // Download file from storage
    const { data, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath)

    if (downloadError) {
      return { success: false, error: downloadError.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Download error:', error)
    return { success: false, error: 'Failed to download file' }
  }
}

export async function getThumbnailUrl(filePath: string, mimeType?: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify the file belongs to the user
    if (!filePath.startsWith(user.id + '/')) {
      return { success: false, error: 'Unauthorized to access this file' }
    }

    // Check if it's an image file
    if (!mimeType || !mimeType.startsWith('image/')) {
      return { success: false, error: 'File is not an image' }
    }

    // Create signed URL with thumbnail transformation
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600, { // 1 hour expiry
        transform: {
          width: 80,
          height: 80,
          resize: 'cover' // This ensures the image fills the dimensions
        }
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error('Get thumbnail error:', error)
    return { success: false, error: 'Failed to get thumbnail' }
  }
}

export async function getFullImageUrl(filePath: string, mimeType?: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify the file belongs to the user
    if (!filePath.startsWith(user.id + '/')) {
      return { success: false, error: 'Unauthorized to access this file' }
    }

    // Check if it's an image file
    if (!mimeType || !mimeType.startsWith('image/')) {
      return { success: false, error: 'File is not an image' }
    }

    // Create signed URL without any transformations (full size)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600) // 1 hour expiry, no transformations

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error('Get full image error:', error)
    return { success: false, error: 'Failed to get full image' }
  }
}

// Data table compatible functions
export async function getFiles(searchParams?: Record<string, unknown>): Promise<{ 
  success: boolean; 
  data?: UserFile[]; 
  count?: number; 
  error?: string 
}> {
  try {
    const result = await getUserFiles()
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch files' }
    }

    // For now, we'll return all files. In a real implementation, you'd want to add pagination
    // and filtering based on searchParams
    // TODO: Implement pagination and filtering using searchParams
    console.log('Search params for files:', searchParams)
    
    return { 
      success: true, 
      data: result.data,
      count: result.data.length
    }
  } catch (error) {
    console.error('Get files error:', error)
    return { success: false, error: 'Failed to fetch files' }
  }
}

export async function deleteFiles(fileIds: string[]): Promise<{ 
  success: boolean; 
  error?: string; 
  deletedCount?: number 
}> {
  try {
    let deletedCount = 0
    const errors: string[] = []

    for (const fileId of fileIds) {
      const result = await deleteFile(fileId)
      if (result.success) {
        deletedCount++
      } else {
        errors.push(result.error || 'Unknown error')
      }
    }

    if (errors.length > 0) {
      return { 
        success: false, 
        error: `Failed to delete ${errors.length} files: ${errors.join(', ')}`,
        deletedCount
      }
    }

    return { success: true, deletedCount }
  } catch (error) {
    console.error('Delete files error:', error)
    return { success: false, error: 'Failed to delete files' }
  }
}

export async function updateFile(id: string, data: Record<string, unknown>): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    // For files, we mainly support updating the name
    const newName = data.name as string
    if (!newName) {
      return { success: false, error: 'Name is required' }
    }

    const result = await updateFileName(id, newName)
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update file' }
    }

    return { success: true }
  } catch (error) {
    console.error('Update file error:', error)
    return { success: false, error: 'Failed to update file' }
  }
}
