import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    let elements
    
    if (search) {
      elements = await dbHelpers.searchElements(search)
    } else if (category) {
      elements = await dbHelpers.getElementsByCategory(category)
    } else {
      elements = await dbHelpers.getAllElements()
    }
    
    return NextResponse.json({ 
      success: true, 
      data: elements,
      count: elements.length 
    })
    
  } catch (error) {
    console.error('Error fetching elements:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch elements',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { name, category, file_path, file_url, tags = [] } = body
    
    if (!name || !category || !file_path || !file_url) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, category, file_path, file_url' 
        }, 
        { status: 400 }
      )
    }
    
    const element = await dbHelpers.addElement({
      name: name.trim(),
      category: category.trim(),
      file_path,
      file_url,
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim()).filter(Boolean) : []
    })
    
    return NextResponse.json({ 
      success: true, 
      data: element,
      message: 'Element created successfully' 
    })
    
  } catch (error) {
    console.error('Error creating element:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create element',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Element ID is required' }, 
        { status: 400 }
      )
    }
    
    await dbHelpers.deleteElement(id)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Element deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting element:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete element',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
