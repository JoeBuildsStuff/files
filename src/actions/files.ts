'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { UserFile } from '@/types'

const BUCKET_NAME = 'files'

export async function uploadFile(formData: FormData): Promise<{ success: boolean; data?: UserFile; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Create user-specific path
    const filePath = `${user.id}/${file.name}`
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    const userFile: UserFile = {
      id: uploadData.path,
      name: file.name,
      path: uploadData.path,
      size: file.size,
      mime_type: file.type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url: urlData.publicUrl
    }

    revalidatePath('/workspace')
    return { success: true, data: userFile }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Failed to upload file' }
  }
}

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
      files.map(async (file: { name: string; created_at: string; updated_at: string; metadata?: { size?: number; mimetype?: string } }) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${user.id}/${file.name}`)

        return {
          id: `${user.id}/${file.name}`,
          name: file.name,
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

    // Create new path
    const newPath = `${user.id}/${newName}`
    
    // Upload with new name
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(newPath, fileData, {
        cacheControl: '3600',
        upsert: true
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
