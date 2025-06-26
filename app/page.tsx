'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { Element, CollageElement, SavedCollage } from '@/lib/types'
import { Download, Save, Shuffle, Loader2, Sparkles, Trash2, RotateCcw, Move, Plus, FolderOpen } from 'lucide-react'

// Smart image component with priority loading
const SmartImage = ({ element, isPriority, onClick }: { element: Element, isPriority?: boolean, onClick: () => void }) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(isPriority || false)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver>()

  useEffect(() => {
    if (isPriority) {
      setShouldLoad(true)
      return
    }

    if (imgRef.current && !shouldLoad) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setShouldLoad(true)
            observerRef.current?.disconnect()
          }
        },
        { rootMargin: '50px' }
      )
      observerRef.current.observe(imgRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [isPriority, shouldLoad])

  return (
    <div 
      ref={imgRef}
      onClick={onClick}
      className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all relative group"
    >
      {shouldLoad ? (
        <img
          src={(element as any).url || (element as any).image || (element as any).file_path || ''}
          alt={element.name}
          className="w-full h-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            imageRendering: 'crisp-edges',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <span className="text-xs text-gray-400">IMG</span>
        </div>
      )}
      
      {shouldLoad && (
        <div className="absolute bottom-1 left-1">
          {!loaded && !error && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
          {loaded && <div className="w-2 h-2 bg-green-400 rounded-full" />}
          {error && <div className="w-2 h-2 bg-red-400 rounded-full" />}
        </div>
      )}

      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
        <div className="transform scale-0 group-hover:scale-100 transition-transform">
          <Plus className="text-white w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

export default function CollageMaker() {
  const [availableElements, setAvailableElements] = useState<Element[]>([])
  const [collageElements, setCollageElements] = useState<any[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingElements, setIsLoadingElements] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [totalElementCount, setTotalElementCount] = useState(0)
  const [visibleElementsCount, setVisibleElementsCount] = useState(24)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const loadElements = async () => {
    try {
      setIsLoadingElements(true)
      console.log('🎯 Loading elements...')
      
      const allElements = await dbHelpers.getAllElements()
      console.log(`✅ Loaded ${allElements.length} total elements`)
      
      const filteredElements = allElements.filter(el => {
        const category = el.category?.toLowerCase() || ''
        const mockCategories = ['explosions', 'nature', 'statues']
        return !mockCategories.includes(category)
      })
      
      setAvailableElements(filteredElements)
      setTotalElementCount(filteredElements.length)
      
      const uniqueCategories = Array.from(new Set(filteredElements.map(el => el.category))).sort()
      setCategories(uniqueCategories)
      
      console.log(`✅ After filtering: ${filteredElements.length} elements, ${uniqueCategories.length} categories`)
      
    } catch (error) {
      console.error('❌ Error loading elements:', error)
    } finally {
      setIsLoadingElements(false)
    }
  }

  useEffect(() => {
    loadElements()
  }, [])

  const filteredElements = useMemo(() => {
    if (selectedCategory === 'all') return availableElements
    return availableElements.filter(element => element.category === selectedCategory)
  }, [availableElements, selectedCategory])

  const addElementToCanvas = useCallback((element: Element) => {
    if (!canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const centerX = canvasRect.width / 2
    const centerY = canvasRect.height / 2
    
    const randomX = centerX + (Math.random() - 0.5) * 100
    const randomY = centerY + (Math.random() - 0.5) * 100

    const newCollageElement = {
      id: `collage-${Date.now()}-${Math.random()}`,
      name: element.name,
      url: (element as any).url || (element as any).image || (element as any).file_path || '',
      x: Math.max(50, Math.min(randomX, canvasRect.width - 100)),
      y: Math.max(50, Math.min(randomY, canvasRect.height - 100)),
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: collageElements.length
    } as CollageElement

    setCollageElements(prev => [...prev, newCollageElement])
    console.log('✅ Added element to canvas:', newCollageElement.name)
  }, [collageElements.length])

  const bringToFront = useCallback((elementId: string) => {
    const maxZ = Math.max(...collageElements.map(el => el.zIndex), 0)
    setCollageElements(prev =>
      prev.map(el =>
        el.id === elementId ? { ...el, zIndex: maxZ + 1 } : el
      )
    )
  }, [collageElements])

  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const element = collageElements.find(el => el.id === elementId)
    if (!element) return

    bringToFront(elementId)
    setSelectedElement(elementId)
    
    const startX = e.clientX
    const startY = e.clientY
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX)
      const deltaY = Math.abs(moveEvent.clientY - startY)
      
      if (deltaX > 3 || deltaY > 3) {
        setIsDragging(true)
        const rect = e.currentTarget.getBoundingClientRect()
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
        document.removeEventListener('mousemove', handleMouseMove)
      }
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    console.log('🖱️ Mouse down on element:', element.name)
  }, [collageElements, bringToFront])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || !canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const newX = e.clientX - canvasRect.left - dragOffset.x
    const newY = e.clientY - canvasRect.top - dragOffset.y

    setCollageElements(prev =>
      prev.map(el =>
        el.id === selectedElement
          ? { 
              ...el, 
              x: Math.max(0, Math.min(newX, canvasRect.width - el.width)),
              y: Math.max(0, Math.min(newY, canvasRect.height - el.height))
            }
          : el
      )
    )
  }, [isDragging, selectedElement, dragOffset])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      console.log('🖱️ Mouse up - drag ended')
    }
  }, [isDragging])

  const handleTouchStart = useCallback((e: React.TouchEvent, elementId: string) => {
    e.preventDefault()
    const touch = e.touches[0]
    const element = collageElements.find(el => el.id === elementId)
    if (!element) return

    bringToFront(elementId)
    setSelectedElement(elementId)
    setIsDragging(true)

    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    })
  }, [collageElements, bringToFront])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !selectedElement || !canvasRef.current) return
    e.preventDefault()

    const touch = e.touches[0]
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const newX = touch.clientX - canvasRect.left - dragOffset.x
    const newY = touch.clientY - canvasRect.top - dragOffset.y

    setCollageElements(prev =>
      prev.map(el =>
        el.id === selectedElement
          ? { 
              ...el, 
              x: Math.max(0, Math.min(newX, canvasRect.width - el.width)),
              y: Math.max(0, Math.min(newY, canvasRect.height - el.height))
            }
          : el
      )
    )
  }, [isDragging, selectedElement, dragOffset])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const deleteElement = useCallback((elementId: string) => {
    setCollageElements(prev => prev.filter(el => el.id !== elementId))
    setSelectedElement(null)
    console.log('🗑️ Deleted element')
  }, [])

  const clearCanvas = useCallback(() => {
    setCollageElements([])
    setSelectedElement(null)
  }, [])

  const generateInspiration = useCallback(async () => {
    setIsGenerating(true)
    try {
      clearCanvas()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!canvasRef.current) return
      
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const elementsToAdd = Math.min(8, filteredElements.length)
      
      const shuffled = [...filteredElements].sort(() => Math.random() - 0.5)
      const selectedElements = shuffled.slice(0, elementsToAdd)
      
      const newElements = selectedElements.map((element, index) => ({
        id: `inspiration-${Date.now()}-${index}`,
        name: element.name,
        url: (element as any).url || (element as any).image || (element as any).file_path || '',
        x: Math.random() * (canvasRect.width - 150),
        y: Math.random() * (canvasRect.height - 150),
        width: 80 + Math.random() * 60,
        height: 80 + Math.random() * 60,
        rotation: (Math.random() - 0.5) * 30,
        zIndex: index
      })) as CollageElement[]
      
      setCollageElements(newElements)
      console.log(`✨ Generated inspiration with ${newElements.length} elements`)
      
    } catch (error) {
      console.error('❌ Error generating inspiration:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [filteredElements])

  const loadMoreElements = useCallback(async () => {
    setIsLoadingMore(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const increment = isMobile ? 12 : 18
    setVisibleElementsCount(prev => prev + increment)
    setIsLoadingMore(false)
  }, [isMobile])

  useEffect(() => {
    setVisibleElementsCount(isMobile ? 18 : 24)
  }, [selectedCategory, isMobile])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedElement(null)
      console.log('👆 Clicked canvas, deselected element')
    }
  }, [])

  const hasMoreElements = visibleElementsCount < filteredElements.length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Collage Creator</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {totalElementCount} elements available
            </span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-60px)]">
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={generateInspiration}
                disabled={isGenerating || filteredElements.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Inspire
              </button>
              <button
                onClick={clearCanvas}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-gray-200">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Categories ({totalElementCount})</option>
              {categories.map(category => {
                const count = availableElements.filter(el => el.category === category).length
                return (
                  <option key={category} value={category}>
                    {category} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoadingElements ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading elements...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {filteredElements.slice(0, visibleElementsCount).map((element, index) => (
                    <SmartImage
                      key={element.id}
                      element={element}
                      isPriority={index < 6}
                      onClick={() => addElementToCanvas(element)}
                    />
                  ))}
                </div>

                {hasMoreElements && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={loadMoreElements}
                      disabled={isLoadingMore}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 mx-auto text-sm"
                    >
                      {isLoadingMore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Load More ({filteredElements.length - visibleElementsCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <div
              ref={canvasRef}
              className="relative w-full h-full bg-white rounded-lg overflow-hidden cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleCanvasClick}
            >
              {collageElements.map((element) => (
                <div
                  key={element.id}
                  className={`absolute cursor-move select-none group transition-all duration-200 ${
                    selectedElement === element.id 
                      ? 'ring-4 ring-yellow-400 ring-opacity-80 shadow-lg' 
                      : 'hover:ring-2 hover:ring-blue-400 hover:shadow-md'
                  }`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    transform: `rotate(${element.rotation}deg)`,
                    zIndex: element.zIndex,
                    transition: isDragging ? 'none' : 'all 0.2s ease',
                    padding: '4px',
                    margin: '-4px'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, element.id)}
                  onTouchStart={(e) => handleTouchStart(e, element.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    deleteElement(element.id)
                  }}
                  onDoubleClick={() => deleteElement(element.id)}
                >
                  <div 
                    className="absolute inset-0 cursor-move"
                    style={{ 
                      padding: '8px', 
                      margin: '-8px',
                      zIndex: 1
                    }}
                  />
                  
                  <img
                    src={(element as any).url || ''}
                    alt={element.name}
                    className="w-full h-full object-cover rounded pointer-events-none relative z-0"
                    style={{
                      imageRendering: 'crisp-edges',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                    draggable={false}
                  />

                  <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded pointer-events-none" />
                  
                  {selectedElement === element.id && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse shadow-lg pointer-events-none" />
                  )}
                </div>
              ))}

              {collageElements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">Your canvas is empty</p>
                    <p className="text-sm">Click elements from the library to add them</p>
                  </div>
                </div>
              )}

              {collageElements.length > 0 && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs">
                  <div>Click to select • Drag to move</div>
                  <div>Right-click or double-tap to delete</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
