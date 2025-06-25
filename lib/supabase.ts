import { createClient } from '@supabase/supabase-js'
import { Element, SavedCollage } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database helper functions
export const dbHelpers = {
  // Elements
  async getAllElements(): Promise<Element[]> {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getElementsByCategory(category: string): Promise<Element[]> {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async searchElements(query: string): Promise<Element[]> {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .or(`name.ilike.%${query}%,category.ilike.%${query}%,tags.cs.{${query}}`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async addElement(element: Omit<Element, 'id' | 'created_at'>): Promise<Element> {
    const { data, error } = await supabase
      .from('elements')
      .insert(element)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteElement(id: string): Promise<void> {
    const { error } = await supabase
      .from('elements')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Collages
  async saveCollage(collage: Omit<SavedCollage, 'id' | 'created_at'>): Promise<SavedCollage> {
    const { data, error } = await supabase
      .from('collages')
      .insert(collage)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getUserCollages(userId?: string): Promise<SavedCollage[]> {
    let query = supabase
      .from('collages')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async deleteCollage(id: string): Promise<void> {
    const { error } = await supabase
      .from('collages')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Storage
  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return publicUrl
  },

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  },

  // Analytics
  async getCategoryStats(): Promise<{ category: string; count: number }[]> {
    const { data, error } = await supabase
      .from('elements')
      .select('category')
    
    if (error) throw error
    
    const stats = data.reduce((acc: Record<string, number>, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {})
    
    return Object.entries(stats).map(([category, count]) => ({
      category,
      count
    }))
  }
}
