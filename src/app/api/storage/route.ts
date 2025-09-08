import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UserFile } from '@/types'
import { sanitizeFileName } from '@/lib/utils/filename'

const BUCKET_NAME = 'files'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Sanitize filename to remove spaces and special characters
    const sanitizedFileName = sanitizeFileName(file.name)
    
    // Create user-specific path with sanitized filename
    const filePath = `${user.id}/${sanitizedFileName}`
    
    // Upload file to storage with original filename in metadata
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        metadata: {
          originalName: file.name
        }
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    const userFile: UserFile = {
      id: uploadData.path,
      name: file.name, // Keep original filename for display
      path: uploadData.path, // This will contain the sanitized filename
      size: file.size,
      mime_type: file.type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url: urlData.publicUrl
    }

    return NextResponse.json({ success: true, data: userFile })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
