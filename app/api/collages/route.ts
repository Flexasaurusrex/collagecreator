import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const limit = searchParams.get('limit')
    
    let collages = await dbHelpers.getUserCollages(userId || undefined)
    
    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        collages = collages.slice(0, limitNum)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data: collages,
      count: collages.length 
    })
    
  } catch (error) {
    console.error('Error fetching collages:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch collages',
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
    const { prompt, elements_data, title, user_id, image_url } = body
    
    if (!prompt || !elements_data || !Array.isArray(elements_data)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: prompt, elements_data (array)' 
        }, 
        { status: 400 }
      )
    }
    
    // Validate elements_data structure
    const isValidElementsData = elements_data.every(element => 
      typeof element === 'object' &&
      element.hasOwnProperty('id') &&
      element.hasOwnProperty('x') &&
      element.hasOwnProperty('y') &&
      element.hasOwnProperty('scale') &&
      element.hasOwnProperty('rotation') &&
      element.hasOwnProperty('opacity') &&
      element.hasOwnProperty('zIndex')
    )
    
    if (!isValidElementsData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid elements_data structure' 
        }, 
        { status: 400 }
      )
    }
    
    const collage = await dbHelpers.saveCollage({
      prompt: prompt.trim(),
      elements_data,
      title: title?.trim() || `Collage: ${prompt.trim()}`,
      user_id: user_id || undefined,
      image_url: image_url || undefined
    })
    
    return NextResponse.json({ 
      success: true, 
      data: collage,
      message: 'Collage saved successfully' 
    })
    
  } catch (error) {
    console.error('Error saving collage:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save collage',
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
        { success: false, error: 'Collage ID is required' }, 
        { status: 400 }
      )
    }
    
    await dbHelpers.deleteCollage(id)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Collage deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting collage:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete collage',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
