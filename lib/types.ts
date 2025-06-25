export interface Element {
  id: string
  name: string
  category: string
  file_path: string
  file_url: string
  tags: string[]
  created_at: string
}

export interface CollageElement extends Element {
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  zIndex: number
  primary: boolean
}

export interface SavedCollage {
  id: string
  user_id?: string
  title?: string
  prompt: string
  elements_data: CollageElement[]
  image_url?: string
  created_at: string
}

export interface CollageConfig {
  prompt: string
  elements: CollageElement[]
  canvas: {
    width: number
    height: number
    background: string
  }
}

export interface UploadProgress {
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

export interface CategoryStats {
  category: string
  count: number
  mostUsed: string[]
}
