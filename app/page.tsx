'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { Element, CollageElement, SavedCollage } from '@/lib/types'
import { Download, Save, Shuffle, Loader2, Sparkles, Trash2, RotateCcw, Move, Plus, FolderOpen } from 'lucide-react'
import html2canvas from 'html2canvas'

export default function CollageCreator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [collageElements, setCollageElements] = useState<CollageElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [availableElements, setAvailableElements] = useState<Element[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [inspirationMode, setInspirationMode] = useState<'minimal' | 'mid' | 'high'>('mid')
  const [isMobile, setIsMobile] = useState(false)
  
  // OPTIMIZED: Smaller initial batches for faster category switching
  const [visibleElementsCount, setVisibleElementsCount] = useState(24)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalElementCount, setTotalElementCount] = useState(0)
  
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [draggedElement, setDraggedElement] = useState<Element | null>(null)
  const [draggedCanvasElement, setDraggedCanvasElement] = useState<CollageElement | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Calculate selectedElement from selectedElementId
  const selectedElement = selectedElementId 
    ? collageElements.find(el => `${el.id}-${el.x}-${el.y}` === selectedElementId)
    : null

  // MEMOIZED: Expensive filtering operations
  const filteredElements = useMemo(() => {
    if (selectedCategory === 'all') return availableElements
    return availableElements.filter(el => el.category === selectedCategory)
  }, [availableElements, selectedCategory])

  // Debug logging for selection
  useEffect(() => {
    console.log('🔍 Selection state:', {
      selectedElementId,
      selectedElement: selectedElement?.name || 'none',
      totalElements: collageElements.length
    })
  }, [selectedElementId, selectedElement, collageElements.length])

  // IMPROVED: Click outside canvas to deselect - but NOT during dragging
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // DON'T deselect during drag operations
      if (draggedCanvasElement) return
      
      // Small delay to avoid interfering with element clicks
      setTimeout(() => {
        if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) {
          // Also check if click is not in the left panel
          const leftPanel = document.querySelector('.w-full.lg\\:w-1\\/3') as HTMLElement
          if (!leftPanel?.contains(e.target as Node)) {
            console.log('🎯 Clicked outside canvas - deselecting')
            setSelectedElementId(null)
          }
        }
      }, 10) // Small delay to let element clicks process first
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [draggedCanvasElement]) // Added draggedCanvasElement as dependency

  useEffect(() => {
    loadElements()
    
    // Mobile detection
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setVisibleElementsCount(mobile ? 18 : 24) // Optimized for faster switching
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Keyboard shortcuts - now placed after selectedElement declaration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedElement && (e.key === 'Delete' || e.key === 'Backspace')) {
        deleteElement(selectedElement)
        e.preventDefault()
      }
      if (selectedElement && e.key === 'Escape') {
        setSelectedElementId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement])



  // PIXEL-PERFECT: Check if click coordinates hit actual image content
  const checkPixelHit = async (imgElement: HTMLImageElement, clickX: number, clickY: number, displayWidth: number, displayHeight: number): Promise<boolean> => {
    return new Promise((resolve) => {
      // Create hidden canvas for pixel detection
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(true) // Fallback to allowing click if canvas not supported
        return
      }
      
      // Set canvas size to match displayed image
      canvas.width = displayWidth
      canvas.height = displayHeight
      
      // Create a new image to avoid CORS issues
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          // Draw image to canvas
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight)
          
          // Get pixel data at click coordinates
          const imageData = ctx.getImageData(Math.max(0, Math.min(clickX, displayWidth-1)), Math.max(0, Math.min(clickY, displayHeight-1)), 1, 1)
          const pixelData = imageData.data
          
          // Check alpha channel (transparency)
          const alpha = pixelData[3]
          
          // Consider pixel "hit" if alpha > threshold (not fully transparent)
          const alphaThreshold = 25 // Slightly higher for cleaner detection
          const isHit = alpha > alphaThreshold
          
          console.log(`🔍 Pixel check at (${Math.round(clickX)}, ${Math.round(clickY)}): alpha=${alpha}, hit=${isHit}`)
          
          resolve(isHit)
        } catch (error) {
          console.log('🚫 Canvas pixel detection failed, allowing click')
          resolve(true) // Fallback to allowing click if detection fails
        }
      }
      
      img.onerror = () => {
        console.log('🚫 Image load failed for pixel detection, allowing click')
        resolve(true) // Fallback to allowing click if image fails to load
      }
      
      // Load the same image source
      img.src = imgElement.src
    })
  }

  // PIXEL-PERFECT: Enhanced element click handler with pixel-based detection
  const handleElementClick = async (e: React.MouseEvent, element: CollageElement) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Get the image element
    const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
    if (!imgElement) return
    
    // Calculate click position relative to the image
    const rect = imgElement.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    // PIXEL DETECTION: Check if click is on actual image content
    const isOnImageContent = await checkPixelHit(imgElement, clickX, clickY, rect.width, rect.height)
    
    if (!isOnImageContent) {
      console.log('🚫 Click outside image pixels - ignoring')
      return // Don't select if clicking outside the actual image content
    }
    
    console.log('✅ Click on image pixels - selecting')
    
    // Right click to delete (desktop only)
    if (e.button === 2 && !isMobile) {
      console.log('🗑️ Right-click delete:', element.name)
      deleteElement(element)
      return
    }
    
    // Left click to select AND bring to ABSOLUTE FRONT
    const elementId = `${element.id}-${element.x}-${element.y}`
    setSelectedElementId(elementId)
    
    // DOM ORDERING APPROACH: Get max z-index and set element higher
    const allZIndexes = collageElements.map(el => el.zIndex)
    const maxZIndex = Math.max(...allZIndexes, 0)
    const newZIndex = maxZIndex + 1000
    
    console.log(`🚀 PIXEL-PERFECT REORDER: ${element.name} z-index ${element.zIndex} → ${newZIndex}`)
    
    // Update z-index - DOM will be automatically reordered by sort()
    setCollageElements(prev => {
      return prev.map(el => {
        if (el.id === element.id && el.x === element.x && el.y === element.y) {
          return { ...el, zIndex: newZIndex }
        }
        return el
      })
    })
  }

  // SIMPLIFIED: Mouse down handler - NO pixel detection to allow free dragging
  const handleElementMouseDown = (e: React.MouseEvent, element: CollageElement) => {
    e.stopPropagation()
    e.preventDefault()
    
    // ALWAYS allow drag start on left click - no pixel detection interference
    if (e.button === 0) {
      console.log('✅ Starting drag for:', element.name)
      setDraggedCanvasElement(element)
      
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (canvasRect) {
        setDragOffset({
          x: e.clientX - canvasRect.left - (element.x / 100) * canvasRect.width,
          y: e.clientY - canvasRect.top - (element.y / 100) * canvasRect.height
        })
      }
    }
  }

  // MOBILE: Simplified touch handler - pixel-perfect selection but free dragging
  const handleElementTouchStart = async (e: React.TouchEvent, element: CollageElement) => {
    e.stopPropagation()
    const touch = e.touches[0]
    
    // For mobile, we'll do pixel detection for selection but allow drag regardless
    let shouldSelect = true
    
    // Get the image element for selection check
    const imgElement = e.currentTarget.querySelector('img') as HTMLImageElement
    if (imgElement) {
      // Calculate touch position relative to the image
      const rect = imgElement.getBoundingClientRect()
      const touchX = touch.clientX - rect.left
      const touchY = touch.clientY - rect.top
      
      // PIXEL DETECTION: Check if touch is on actual image content
      const isOnImageContent = await checkPixelHit(imgElement, touchX, touchY, rect.width, rect.height)
      
      if (!isOnImageContent) {
        console.log('🚫 Touch outside image pixels - ignoring selection')
        shouldSelect = false
      } else {
        console.log('✅ Touch on image pixels - selecting')
      }
    }
    
    if (shouldSelect) {
      // Select element and bring to front
      const elementId = `${element.id}-${element.x}-${element.y}`
      setSelectedElementId(elementId)
      
      // DOM ORDERING: Get max z-index and set element higher
      const allZIndexes = collageElements.map(el => el.zIndex)
      const maxZIndex = Math.max(...allZIndexes, 0)
      const newZIndex = maxZIndex + 1000
      
      console.log(`🚀 MOBILE PIXEL REORDER: ${element.name} z-index ${element.zIndex} → ${newZIndex}`)
      
      // Update z-index
      setCollageElements(prev => {
        return prev.map(el => {
          if (el.id === element.id && el.x === element.x && el.y === element.y) {
            return { ...el, zIndex: newZIndex }
          }
          return el
        })
      })
    }
    
    // ALWAYS allow drag start regardless of pixel detection
    console.log('✅ Starting mobile drag for:', element.name)
    setDraggedCanvasElement(element)
    
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (canvasRect) {
      setDragOffset({
        x: touch.clientX - canvasRect.left - (element.x / 100) * canvasRect.width,
        y: touch.clientY - canvasRect.top - (element.y / 100) * canvasRect.height
      })
    }
  }

  // PIXEL-PERFECT: Component for elements with pixel-based click detection
  const PixelPerfectElement = ({ element, isSelected, isDraggedElement }: { 
    element: CollageElement, 
    isSelected: boolean, 
    isDraggedElement: boolean 
  }) => {
    const imgRef = useRef<HTMLImageElement>(null)
    
    const elementId = `${element.id}-${element.x}-${element.y}`
    
    return (
      <div
        className={`collage-element absolute select-none transition-all duration-200 ease-out ${
          isSelected ? 'ring-2 ring-yellow-400 shadow-2xl' : 'hover:ring-1 hover:ring-blue-400'
        } ${isDraggedElement ? 'opacity-90 scale-110' : ''}`}
        style={{
          left: `${element.x}%`,
          top: `${element.y}%`,
          transform: `translate3d(0, 0, 0) rotate(${element.rotation}deg) scale(${element.scale})`,
          opacity: isDraggedElement ? 0.9 : element.opacity,
          transformOrigin: 'center',
          cursor: isDraggedElement ? 'grabbing' : (isSelected ? 'grab' : 'pointer'),
          pointerEvents: 'auto',
          willChange: isDraggedElement ? 'transform' : 'auto',
          backfaceVisibility: 'hidden',
          // REMOVED: clip-path that was restricting drag area
        }}
        onMouseDown={(e) => handleElementMouseDown(e, element)}
        onClick={(e) => handleElementClick(e, element)}
        onTouchStart={(e) => handleElementTouchStart(e, element)}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isMobile) {
            deleteElement(element)
          }
        }}
        onMouseEnter={(e) => {
          if (!isSelected && !isDraggedElement) {
            const elementDiv = e.currentTarget as HTMLElement
            elementDiv.style.filter = 'brightness(1.1) drop-shadow(0 4px 12px rgba(59, 130, 246, 0.4))'
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            const elementDiv = e.currentTarget as HTMLElement
            elementDiv.style.filter = 'drop-shadow-lg'
          }
        }}
      >
        <img
          ref={imgRef}
          src={element.file_url}
          alt={element.name}
          className="object-contain drop-shadow-lg"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.opacity = '0.3'
            e.currentTarget.style.filter = 'grayscale(100%)'
          }}
          style={{
            imageRendering: 'crisp-edges',
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            display: 'block',
            maxWidth: '300px',
            maxHeight: '300px',
            width: 'auto',
            height: 'auto',
            // IMPORTANT: Remove pointer events from image to let parent handle clicks
            pointerEvents: 'none'
          }}
        />
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg pointer-events-none animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        )}
      </div>
    )
  }

  // TELEPORTATION: Instant manifesting image component - no loading states, no delays
  const TeleportImage = ({ element, onClick, index }: { element: Element, onClick: () => void, index: number }) => {
    const imgRef = useRef<HTMLImageElement>(null)

    // MANIFEST IMMEDIATELY: No loading states, no waiting, just pure manifestation
    const shouldRender = index < visibleElementsCount

    // AGGRESSIVE INSTANT PRELOAD: Force immediate loading on mount
    useEffect(() => {
      if (!shouldRender) return

      // INSTANT PRELOAD: Don't wait for anything, just load it NOW
      const img = new Image()
      img.src = element.file_url // Start loading immediately
      
      // Don't wait for onload - just trust it's loading in background
    }, [shouldRender, element.file_url])

    if (!shouldRender) {
      return (
        <div className="aspect-square bg-gray-900 border border-gray-700 flex items-center justify-center">
          <div className="text-xs text-gray-600">•</div>
        </div>
      )
    }

    return (
      <div
        className="aspect-square bg-gray-800 border border-gray-600 hover:border-blue-500 cursor-pointer transition-all duration-100 hover:scale-105 p-1 group relative overflow-hidden"
        onClick={onClick}
        title={`${element.name} - Click to add`}
      >
        {/* TELEPORTATION: Show image immediately, no loading states */}
        <img
          ref={imgRef}
          src={element.file_url}
          alt={element.name}
          className="w-full h-full object-contain opacity-100 scale-100 group-hover:opacity-80 group-hover:scale-105"
          loading="eager" // FORCE immediate loading
          decoding="sync" // FORCE synchronous decoding - no delays
          style={{
            imageRendering: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            maxWidth: '120px', // SMALLER for faster loading
            maxHeight: '120px'
          }}
          // NO onLoad handler - just let it appear when ready
          onError={(e) => {
            // Fail silently - don't show error states that slow things down
            e.currentTarget.style.opacity = '0.3'
          }}
        />
        
        {/* NO LOADING STATES - they just slow things down */}
        
        {/* INSTANT PRIORITY INDICATOR */}
        {index < 12 && (
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-green-400 rounded-full opacity-80"></div>
        )}
        
        {/* INSTANT HOVER EFFECT */}
        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-15 transition-opacity duration-100 pointer-events-none"></div>
      </div>
    )
  }

  // OPTIMIZED: Load elements with minimal filtering
  const loadElements = async () => {
    try {
      console.log('🚀 Loading elements with 10k limit...')
      
      // Get all elements (now with 10k limit from Supabase)
      const allElements = await dbHelpers.getAllElements()
      
      // MINIMAL filtering - only filter very obvious problematic elements
      const filteredElements = allElements.filter(el => {
        const name = el.name.toLowerCase()
        
        // Only exclude the most obvious UI elements that would appear as tiny dots
        const problematicKeywords = ['cursor', 'loading', 'spinner']
        
        const hasProblematicName = problematicKeywords.some(keyword => 
          name.includes(keyword)
        )
        
        return !hasProblematicName
      })
      
      console.log(`🎯 Loaded ${filteredElements.length} elements (filtered out ${allElements.length - filteredElements.length} obvious UI elements)`)
      
      setAvailableElements(filteredElements)
      setTotalElementCount(filteredElements.length)
      
      // Get unique categories and filter out mock/sample categories
      const allCategories = Array.from(new Set(filteredElements.map(el => el.category))).sort()
      const cleanCategories = allCategories.filter(category => {
        // Remove mock/sample categories from previous sessions
        const mockCategories = ['explosions', 'nature', 'statues']
        return !mockCategories.includes(category.toLowerCase())
      })
      
      console.log(`📁 Categories: ${cleanCategories.length} (filtered out mock categories)`)
      setCategories(cleanCategories)
      
    } catch (error) {
      console.error('❌ Error loading elements:', error)
    }
  }

  // Progressive loading function with teleportation UX
  const loadMoreElements = useCallback(async () => {
    setIsLoadingMore(true)
    
    // TELEPORTATION: Minimal delay for instant feedback
    await new Promise(resolve => setTimeout(resolve, 50)) // Ultra-reduced delay
    
    const increment = isMobile ? 15 : 24 // Larger increments for fewer clicks
    setVisibleElementsCount(prev => prev + increment)
    setIsLoadingMore(false)
  }, [isMobile])

  // TELEPORTATION: Instant category switching with zero delays
  useEffect(() => {
    // INSTANT: Reset visible count immediately for instant switching
    setVisibleElementsCount(isMobile ? 18 : 24)
    
    // TELEPORTATION PRELOAD: Start loading ALL visible images immediately in parallel
    if (filteredElements.length > 0) {
      const preloadCount = Math.min(24, filteredElements.length) // Load more aggressively
      
      // PARALLEL LOADING: Fire off ALL requests at once, don't wait for anything
      filteredElements.slice(0, preloadCount).forEach((element) => {
        const img = new Image()
        img.src = element.file_url // Just fire and forget - no callbacks, no waiting
      })
    }
  }, [selectedCategory, isMobile, filteredElements])

  // PERFECTED collage generation logic (based on Wild Escape success)
  const getFoundationalPlacement = (role: 'sky' | 'ground' | 'midground' | 'foreground') => {
    if (role === 'sky') {
      return {
        x: -30 + Math.random() * 60, // Can extend well beyond canvas for full coverage
        y: -20 + Math.random() * 25, // TOP 30-40% coverage
        scale: Math.max(3.0, 6.0 + Math.random() * 3.0), // EVEN MORE MASSIVE sky (6x-9x, min 3x)
        rotation: (Math.random() - 0.5) * 4, // Almost perfectly horizontal
        opacity: 0.8 + Math.random() * 0.2,
        zIndex: 1 + Math.random() * 3 // SKY LAYER: 1-4 (ALWAYS furthest back)
      }
    } else if (role === 'ground') {
      return {
        x: -30 + Math.random() * 60, // Extend beyond for full coverage
        y: 55 + Math.random() * 30, // BOTTOM 60-70% coverage
        scale: Math.max(2.5, 5.0 + Math.random() * 2.5), // MASSIVE ground coverage (5x-7.5x, min 2.5x)
        rotation: (Math.random() - 0.5) * 3, // Almost perfectly vertical
        opacity: 0.85 + Math.random() * 0.15,
        zIndex: 10 + Math.random() * 5 // GROUND LAYER: 10-15 (behind midground/foreground)
      }
    } else if (role === 'midground') {
      return {
        x: 20 + Math.random() * 60, // More centered placement
        y: 30 + Math.random() * 40,
        scale: Math.max(1.0, 2.2 + Math.random() * 1.8), // Larger midground (2.2x-4x, min 1x)
        rotation: (Math.random() - 0.5) * 25,
        opacity: 0.85 + Math.random() * 0.15,
        zIndex: 20 + Math.random() * 5 // MIDGROUND LAYER: 20-25
      }
    } else {
      return {
        x: 25 + Math.random() * 50, // More strategic placement
        y: 20 + Math.random() * 60,
        scale: Math.max(0.8, 1.2 + Math.random() * 1.3), // Bigger foreground details (1.2x-2.5x, min 0.8x)
        rotation: (Math.random() - 0.5) * 45,
        opacity: 0.8 + Math.random() * 0.2,
        zIndex: 30 + Math.random() * 10 // FOREGROUND LAYER: 30-40 (always on top)
      }
    }
  }

  const identifyElementRole = (element: Element): 'sky' | 'ground' | 'midground' | 'foreground' => {
    const name = element.name.toLowerCase()
    const category = element.category.toLowerCase()
    
    // SKY elements - prioritize anything that could be background
    const skyKeywords = ['sky', 'cloud', 'sunset', 'sunrise', 'horizon', 'space', 'star', 'moon', 'sun', 'background', 'texture', 'gradient', 'atmosphere']
    if (skyKeywords.some(keyword => name.includes(keyword)) || ['sky', 'space', 'backgrounds', 'textures'].includes(category)) {
      return 'sky'
    }
    
    // GROUND elements - buildings, architecture, landscapes that should be foundation
    const groundKeywords = ['building', 'architecture', 'landscape', 'city', 'house', 'structure', 'monument', 'tower', 'bridge', 'wall', 'ground', 'floor', 'foundation']
    if (groundKeywords.some(keyword => name.includes(keyword)) || 
        ['architecture', 'buildings', 'landscapes', 'monuments', 'structures'].includes(category)) {
      return 'ground'
    }
    
    // MIDGROUND - people, vehicles, large objects that are focal points
    const midgroundKeywords = ['people', 'person', 'vehicle', 'car', 'animal', 'statue', 'furniture', 'tree', 'plant', 'large']
    if (midgroundKeywords.some(keyword => name.includes(keyword)) || 
        ['people', 'vehicles', 'animals', 'statues', 'furniture', 'nature'].includes(category)) {
      return 'midground'
    }
    
    // Everything else is FOREGROUND (small details, objects, decorations)
    return 'foreground'
  }

  const generateInspiration = async () => {
    if (availableElements.length === 0) {
      alert('No elements available. Please upload some elements first.')
      return
    }
    
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 600))
    
    try {
      console.log('🎨 Generating artistic inspiration from', availableElements.length, 'elements...')
      
      const elements: CollageElement[] = []
      
      // SKY FOUNDATION - 1-2 massive elements that FILL the top
      const skyElements = availableElements.filter(el => identifyElementRole(el) === 'sky')
      if (skyElements.length > 0) {
        const skyCount = Math.random() > 0.7 ? 2 : 1 // Usually 1, sometimes 2
        for (let i = 0; i < skyCount; i++) {
          const element = skyElements[Math.floor(Math.random() * skyElements.length)]
          const placement = getFoundationalPlacement('sky')
          
          elements.push({
            ...element,
            ...placement,
            primary: true
          })
        }
        console.log(`🌌 Placed ${skyCount} MASSIVE sky foundation(s) - Z-INDEX: 1-4 (SKY LAYER)`)
      } else {
        // Fallback: use any element as sky if no sky elements available
        const fallbackElement = availableElements[Math.floor(Math.random() * availableElements.length)]
        const placement = getFoundationalPlacement('sky')
        elements.push({
          ...fallbackElement,
          ...placement,
          primary: true
        })
        console.log('🌌 Placed fallback massive sky foundation - Z-INDEX: 1-4 (SKY LAYER)')
      }
      
      // GROUND FOUNDATION - 1-2 massive elements that FILL the bottom  
      const groundElements = availableElements.filter(el => identifyElementRole(el) === 'ground')
      if (groundElements.length > 0) {
        const groundCount = Math.random() > 0.5 ? 2 : 1 // Usually 1-2
        for (let i = 0; i < groundCount; i++) {
          const element = groundElements[Math.floor(Math.random() * groundElements.length)]
          const placement = getFoundationalPlacement('ground')
          
          elements.push({
            ...element,
            ...placement,
            primary: true
          })
        }
        console.log(`🏗️ Placed ${groundCount} MASSIVE ground foundation(s) - Z-INDEX: 10-15 (GROUND LAYER)`)
      } else {
        // Fallback: use any element as ground if no ground elements available
        const fallbackElement = availableElements[Math.floor(Math.random() * availableElements.length)]
        const placement = getFoundationalPlacement('ground')
        elements.push({
          ...fallbackElement,
          ...placement,
          primary: true
        })
        console.log('🏗️ Placed fallback massive ground foundation - Z-INDEX: 10-15 (GROUND LAYER)')
      }
      
      // MIDGROUND LAYER - varies by mode
      const midgroundElements = availableElements.filter(el => identifyElementRole(el) === 'midground')
      if (midgroundElements.length > 0 && (inspirationMode === 'mid' || inspirationMode === 'high')) {
        let midCount: number
        if (inspirationMode === 'mid') {
          midCount = Math.floor(Math.random() * 2) + 1 // 1-2 elements for mid mode
        } else {
          midCount = Math.floor(Math.random() * 3) + 2 // 2-4 elements for high mode
        }
        
        for (let i = 0; i < midCount; i++) {
          const element = midgroundElements[Math.floor(Math.random() * midgroundElements.length)]
          const placement = getFoundationalPlacement('midground')
          
          elements.push({
            ...element,
            ...placement,
            primary: i === 0
          })
        }
        console.log(`🎯 Placed ${midCount} midground elements - Z-INDEX: 20-25 (MIDGROUND LAYER)`)
      }
      
      // FOREGROUND DETAILS - varies by mode
      const foregroundElements = availableElements.filter(el => identifyElementRole(el) === 'foreground')
      if (foregroundElements.length > 0 && (inspirationMode === 'mid' || inspirationMode === 'high')) {
        let foregroundCount: number
        if (inspirationMode === 'mid') {
          foregroundCount = Math.floor(Math.random() * 3) + 1 // 1-3 elements for mid mode
        } else {
          foregroundCount = Math.floor(Math.random() * 4) + 3 // 3-6 elements for high mode
        }
        
        for (let i = 0; i < foregroundCount; i++) {
          const element = foregroundElements[Math.floor(Math.random() * foregroundElements.length)]
          const placement = getFoundationalPlacement('foreground')
          
          elements.push({
            ...element,
            ...placement,
            primary: false
          })
        }
        console.log(`✨ Placed ${foregroundCount} foreground details - Z-INDEX: 30-40 (FOREGROUND LAYER)`)
      }
      
      // Sort by z-index
      elements.sort((a, b) => a.zIndex - b.zIndex)
      
      console.log(`🔥 ${inspirationMode.toUpperCase()} INSPIRATION READY: ${elements.length} elements with perfect hierarchy`)
      setCollageElements(elements)
      
    } catch (error) {
      console.error('Error generating inspiration:', error)
      alert('Error generating inspiration. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const addElementToCanvas = (element: Element, x: number = 50, y: number = 50) => {
    // FIXED: Always place manually added elements ON TOP of existing elements
    
    // Find the highest z-index currently on canvas
    const maxZIndex = collageElements.length > 0 
      ? Math.max(...collageElements.map(el => el.zIndex))
      : 0
    
    // Determine appropriate initial scale based on element role
    const role = identifyElementRole(element)
    let initialScale: number
    
    if (role === 'sky') {
      initialScale = Math.max(1.5, 2.0 + Math.random() * 1.0) // Start larger for sky elements
    } else if (role === 'ground') {
      initialScale = Math.max(1.2, 1.5 + Math.random() * 0.8) // Start larger for ground elements
    } else if (role === 'midground') {
      initialScale = Math.max(1.0, 1.0 + Math.random() * 0.5) // Normal starting size
    } else {
      initialScale = Math.max(0.8, 1.0) // Ensure minimum readable size, no dots
    }
    
    // ALWAYS place new elements on top with a buffer
    const newZIndex = maxZIndex + 10
    
    const newElement: CollageElement = {
      ...element,
      x: x,
      y: y,
      scale: initialScale,
      rotation: 0,
      opacity: 1.0,
      zIndex: newZIndex, // FIXED: Always on top
      primary: false
    }
    
    console.log(`✨ Added ${element.name} on top with z-index: ${newZIndex} (was max: ${maxZIndex})`)
    setCollageElements(prev => [...prev, newElement])
  }

  const deleteElement = (elementToDelete: CollageElement) => {
    setCollageElements(prev => prev.filter(el => 
      !(el.id === elementToDelete.id && el.x === elementToDelete.x && el.y === elementToDelete.y)
    ))
    setSelectedElementId(null)
  }

  const updateElement = (elementToUpdate: CollageElement, updates: Partial<CollageElement>) => {
    // Direct update for immediate response (sliders, etc.)
    setCollageElements(prev => prev.map(el => 
      (el.id === elementToUpdate.id && el.x === elementToUpdate.x && el.y === elementToUpdate.y) 
        ? { ...el, ...updates }
        : el
    ))
  }

  const updateElementSmooth = (elementToUpdate: CollageElement, updates: Partial<CollageElement>) => {
    // Smooth update with requestAnimationFrame for dragging
    requestAnimationFrame(() => {
      setCollageElements(prev => prev.map(el => 
        (el.id === elementToUpdate.id && el.x === elementToUpdate.x && el.y === elementToUpdate.y) 
          ? { ...el, ...updates }
          : el
      ))
    })
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggedCanvasElement && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      
      // LIBERAL: Allow elements to go well beyond canvas bounds
      const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100
      const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100
      
      // VERY GENEROUS constraints - allow way off canvas positioning
      const constrainedX = Math.max(-200, Math.min(300, newX))
      const constrainedY = Math.max(-200, Math.min(300, newY))
      
      // Use smooth update for buttery dragging
      updateElementSmooth(draggedCanvasElement, { x: constrainedX, y: constrainedY })
      setDraggedCanvasElement({ ...draggedCanvasElement, x: constrainedX, y: constrainedY })
    } else if (isDragging && zoom > 1) {
      // Pan canvas when zoomed - also buttery smooth
      requestAnimationFrame(() => {
        setPan(prev => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY
        }))
      })
    }
  }

  const handleCanvasMouseUp = () => {
    setDraggedCanvasElement(null)
    setIsDragging(false)
  }

  const saveCollage = async () => {
    if (collageElements.length === 0) {
      alert('Create a collage first!')
      return
    }
    
    setIsSaving(true)
    
    try {
      await dbHelpers.saveCollage({
        prompt: 'Custom Collage Creation',
        elements_data: collageElements,
        title: `Collage Creation ${Date.now()}`
      })
      
      alert('Collage saved!')
    } catch (error) {
      console.error('Error saving collage:', error)
      alert('Error saving collage. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const exportCollage = async () => {
    if (!canvasRef.current || collageElements.length === 0) {
      alert('Create a collage first!')
      return
    }
    
    setIsExporting(true)
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight
      })
      
      const link = document.createElement('a')
      link.download = `collage-creation-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error exporting collage:', error)
      alert('Error exporting collage. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Header - Only visible on desktop */}
      <div className="hidden lg:block absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
          COLLAGE CREATOR
        </h1>
      </div>

      {/* Mobile Interface */}
      {isMobile ? (
        <>
          {/* Mobile Header Controls */}
          <div className="bg-black p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  COLLAGE CREATOR
                </h1>
                <div className="text-xs text-gray-400">Mobile • {availableElements.length} elements • PIXEL-PERFECT</div>
              </div>
              {selectedElement && (
                <button
                  onClick={() => deleteElement(selectedElement)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  DELETE
                </button>
              )}
            </div>
            
            {/* Mobile Generation Modes */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['minimal', 'mid', 'high'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setInspirationMode(mode)}
                  className={`p-2 text-xs font-bold transition-all duration-200 ${
                    inspirationMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
            
            {/* Mobile Generate Button */}
            <button
              onClick={generateInspiration}
              disabled={isGenerating || availableElements.length === 0}
              className={`w-full p-3 text-sm font-bold transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                isGenerating 
                  ? 'bg-gray-600' 
                  : 'bg-gradient-to-r from-green-600 to-blue-600'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  GENERATING...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  GENERATE COLLAGE
                </>
              )}
            </button>
            
            {selectedElement && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500 rounded">
                <div className="text-xs font-bold text-yellow-400 mb-2">EDITING: {selectedElement.name}</div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400">SIZE</label>
                    <input
                      type="range"
                      min="0.5"
                      max="4"
                      step="0.1"
                      value={selectedElement.scale}
                      onChange={(e) => updateElement(selectedElement, { scale: parseFloat(e.target.value) })}
                      className="w-full accent-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">ROTATION</label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="15"
                      value={selectedElement.rotation}
                      onChange={(e) => updateElement(selectedElement, { rotation: parseInt(e.target.value) })}
                      className="w-full accent-yellow-400"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-3 text-center">
              <div className="text-xs text-gray-400">
                {collageElements.length} elements • Touch image pixels to select • Drag freely anywhere!
              </div>
            </div>
          </div>
          
          {/* Mobile Canvas */}
          <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
            <div className="w-full h-full flex items-center justify-center p-4">
              <div 
                className="relative shadow-2xl"
                style={{ 
                  aspectRatio: '3/4', 
                  width: '100%',
                  maxWidth: '400px',
                  maxHeight: 'calc(100vh - 280px)',
                  overflow: 'hidden',
                  cursor: 'default'
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0]
                  if (touch && draggedCanvasElement && canvasRef.current) {
                    const rect = canvasRef.current.getBoundingClientRect()
                    const newX = ((touch.clientX - rect.left - dragOffset.x) / rect.width) * 100
                    const newY = ((touch.clientY - rect.top - dragOffset.y) / rect.height) * 100
                    // GENEROUS mobile constraints
                    const constrainedX = Math.max(-200, Math.min(300, newX))
                    const constrainedY = Math.max(-200, Math.min(300, newY))
                    updateElementSmooth(draggedCanvasElement, { x: constrainedX, y: constrainedY })
                    setDraggedCanvasElement({ ...draggedCanvasElement, x: constrainedX, y: constrainedY })
                  }
                }}
                onTouchEnd={() => {
                  setDraggedCanvasElement(null)
                  setIsDragging(false)
                }}
              >
                <div 
                  ref={canvasRef}
                  className="collage-canvas bg-white relative w-full h-full"
                  style={{
                    transform: `scale(${zoom}) translate3d(${pan.x / zoom}px, ${pan.y / zoom}px, 0)`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    willChange: isDragging || zoom !== 1 ? 'transform' : 'auto',
                    backfaceVisibility: 'hidden',
                    overflow: 'hidden'
                  }}
                >
                  {/* PIXEL-PERFECT: DOM reordering with pixel-based click detection */}
                  {collageElements
                    .slice() // Create copy to avoid mutating original array
                    .sort((a, b) => a.zIndex - b.zIndex) // Sort by z-index - lower first, higher last (on top)
                    .map((element) => (
                      <PixelPerfectElement
                        key={`${element.id}-${element.x}-${element.y}`}
                        element={element}
                        isSelected={selectedElementId === `${element.id}-${element.x}-${element.y}`}
                        isDraggedElement={draggedCanvasElement === element}
                      />
                    ))}
                  
                  {collageElements.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center p-4">
                        <Sparkles className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-sm mb-2">Ready to create?</p>
                        <p className="text-xs text-gray-500">Tap "Generate Collage" above</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop Interface */}
          <div className="w-full lg:w-1/3 bg-black p-4 lg:p-6 flex flex-col">
            {/* Compact Header - moved main title to page header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-blue-400" />
                <label className="text-sm font-bold text-gray-400 tracking-wide">
                  INSPIRATION MODE
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(['minimal', 'mid', 'high'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setInspirationMode(mode)}
                    className={`p-2 text-xs font-bold transition-all duration-200 ${
                      inspirationMode === mode
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {mode.toUpperCase()}
                    <div className="text-xs font-normal opacity-75 mt-1">
                      {mode === 'minimal' && 'Foundation only'}
                      {mode === 'mid' && 'Balanced mix'}
                      {mode === 'high' && 'Dense layers'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              {/* Generate Inspiration */}
              <div>
                <button
                  onClick={generateInspiration}
                  disabled={isGenerating || availableElements.length === 0}
                  className={`w-full p-4 text-base font-bold transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                    isGenerating 
                      ? 'bg-gray-600' 
                      : 'bg-gradient-to-r from-green-600 to-blue-600 hover:shadow-2xl hover:scale-105 transform'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      GENERATING...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      GENERATE {inspirationMode.toUpperCase()} INSPIRATION
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Using {availableElements.length} loaded elements • PIXEL-PERFECT CLICK DETECTION
                </p>
              </div>

              {/* Element Library - COMPACT */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen size={16} className="text-blue-400" />
                  <label className="text-sm font-bold text-gray-400 tracking-wide">
                    ELEMENTS ({availableElements.length})
                  </label>
                </div>
                
                {/* Category Filter with TELEPORTATION switching */}
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const newCategory = e.target.value
                    
                    // TELEPORTATION: Update instantly, no delays, no caching overhead
                    setSelectedCategory(newCategory)
                    
                    // INSTANT PRELOAD: Fire off all requests immediately
                    const newFilteredElements = newCategory === 'all' 
                      ? availableElements 
                      : availableElements.filter(el => el.category === newCategory)
                    
                    // AGGRESSIVE PARALLEL LOADING: Load first 30 images immediately
                    const preloadCount = Math.min(30, newFilteredElements.length)
                    newFilteredElements.slice(0, preloadCount).forEach((element) => {
                      const img = new Image()
                      img.src = element.file_url // Fire and forget - maximum speed
                    })
                  }}
                  className="w-full p-2 bg-gray-800 border border-gray-700 text-white mb-3 text-sm transition-all duration-100 hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Categories ({availableElements.length})</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)} ({availableElements.filter(el => el.category === category).length})
                    </option>
                  ))}
                </select>

                {/* TELEPORTATION Elements Grid */}
                <div className="max-h-96 overflow-y-auto border border-gray-700 bg-gray-900 p-2">
                  {/* PERFORMANCE TIP */}
                  {selectedCategory !== 'all' && filteredElements.length > 0 && (
                    <div className="text-xs text-green-400 mb-2 p-1 bg-green-900/20 border border-green-500/30 rounded">
                      🎯 {filteredElements.length} elements • PIXEL-PERFECT: Click only image content, drag anywhere!
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-2">
                    {filteredElements.slice(0, visibleElementsCount).map((element, index) => (
                      <TeleportImage
                        key={`${selectedCategory}-${element.id}`} // OPTIMIZED: Force re-render on category change
                        element={element}
                        index={index}
                        onClick={() => addElementToCanvas(element)}
                      />
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {filteredElements.length > visibleElementsCount && (
                    <div className="text-center mt-3">
                      <button
                        onClick={loadMoreElements}
                        disabled={isLoadingMore}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-2 text-xs font-semibold transition-colors duration-200 flex items-center gap-2 mx-auto"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            LOADING...
                          </>
                        ) : (
                          <>
                            LOAD MORE ({filteredElements.length - visibleElementsCount} remaining)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  
                  {visibleElementsCount >= filteredElements.length && filteredElements.length > 24 && (
                    <div className="text-center text-xs text-gray-500 mt-2">
                      All {filteredElements.length} elements loaded
                    </div>
                  )}
                  
                  {filteredElements.length === 0 && (
                    <div className="text-center text-gray-500 py-6">
                      <p className="text-sm">No elements in this category</p>
                      <p className="text-xs mt-1">Try selecting "All Categories"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Element Editor - COMPACT */}
              {selectedElement ? (
                <div className="border-t border-yellow-500 bg-yellow-900/20 rounded pt-3 px-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-bold tracking-wide text-yellow-400 text-sm">🎯 {selectedElement.name}</h3>
                      <div className="text-xs text-gray-400">
                        {identifyElementRole(selectedElement).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          // DOM ORDERING: Same logic as clicking - force to absolute front with massive jump
                          const allZIndexes = collageElements.map(el => el.zIndex)
                          const maxZIndex = Math.max(...allZIndexes, 0)
                          const newZIndex = maxZIndex + 1000
                          
                          console.log(`🔝 TOP BUTTON: ${selectedElement.name} → z-index ${newZIndex} (will be last in DOM)`)
                          
                          setCollageElements(prev => {
                            return prev.map(el => 
                              (el.id === selectedElement.id && el.x === selectedElement.x && el.y === selectedElement.y) 
                                ? { ...el, zIndex: newZIndex }
                                : el
                            )
                          })
                        }}
                        className="bg-blue-600 hover:bg-blue-700 px-2 py-1 text-xs font-semibold transition-colors"
                      >
                        TOP
                      </button>
                      <button
                        onClick={() => deleteElement(selectedElement)}
                        className="bg-red-600 hover:bg-red-700 px-2 py-1 text-xs font-semibold transition-colors"
                      >
                        DEL
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-400">SCALE</label>
                      <input
                        type="range"
                        min="0.2"
                        max="6"
                        step="0.1"
                        value={selectedElement.scale}
                        onChange={(e) => updateElement(selectedElement, { scale: parseFloat(e.target.value) })}
                        className="w-full accent-yellow-400"
                      />
                      <div className="text-xs text-gray-500">{selectedElement.scale.toFixed(1)}x</div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-400">ROTATION</label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={selectedElement.rotation}
                        onChange={(e) => updateElement(selectedElement, { rotation: parseInt(e.target.value) })}
                        className="w-full accent-yellow-400"
                      />
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">{selectedElement.rotation}°</div>
                        <button
                          onClick={() => updateElement(selectedElement, { rotation: 0 })}
                          className="bg-gray-700 hover:bg-gray-600 px-2 py-1 text-xs transition-colors duration-150"
                        >
                          RESET
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-400">OPACITY</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={selectedElement.opacity}
                        onChange={(e) => updateElement(selectedElement, { opacity: parseFloat(e.target.value) })}
                        className="w-full accent-yellow-400"
                      />
                      <div className="text-xs text-gray-500">{Math.round(selectedElement.opacity * 100)}%</div>
                    </div>
                  </div>
                </div>
              ) : collageElements.length > 0 ? (
                <div className="border-t border-gray-800 pt-3">
                  <div className="bg-blue-900/30 border border-blue-600 rounded p-3 text-center">
                    <h3 className="font-bold text-blue-400 mb-2 text-sm">🎯 PIXEL-PERFECT TOOLS</h3>
                    <div className="text-xs text-gray-300 space-y-1">
                      <p><span className="text-yellow-400">CLICK IMAGE CONTENT</span> to select • <span className="text-red-400">RIGHT-CLICK</span> to delete</p>
                      <p><span className="text-green-400">DRAG ANYWHERE</span> to move freely • <span className="text-blue-400">DEL</span> key to remove</p>
                      <p className="text-cyan-400">🎯 Only pixels respond - drag unrestricted!</p>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={saveCollage}
                  disabled={collageElements.length === 0 || isSaving}
                  className="bg-gray-800 hover:bg-gray-700 p-4 flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  SAVE
                </button>
                <button
                  onClick={exportCollage}
                  disabled={collageElements.length === 0 || isExporting}
                  className="bg-gray-800 hover:bg-gray-700 p-4 flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  {isExporting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  EXPORT
                </button>
              </div>

              {/* Quick Actions */}
              {collageElements.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (confirm('Clear all elements? This cannot be undone.')) {
                        setCollageElements([])
                        setSelectedElementId(null)
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={16} />
                    CLEAR ALL
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              {collageElements.length > 0 && (
                <div className="border-t border-gray-800 pt-4">
                  <h3 className="font-bold mb-3 tracking-wide text-gray-400">CANVAS VIEW</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-12 text-gray-400">ZOOM:</span>
                      <button
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                        className="bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                      >
                        -
                      </button>
                      <span className="bg-gray-800 px-3 py-2 text-sm min-w-16 text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                        className="bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setZoom(1)
                        setPan({ x: 0, y: 0 })
                      }}
                      className="w-full bg-gray-800 p-3 text-sm hover:bg-gray-700 transition-colors font-semibold"
                    >
                      RESET VIEW
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500 border-t border-gray-800 pt-4">
              <div className="text-center space-y-1">
                <p className="font-bold text-gray-400">
                  🎯 PIXEL-PERFECT DETECTION: {availableElements.length.toLocaleString()} ELEMENTS • {collageElements.length} ON CANVAS
                </p>
                <p className="text-gray-600">Click detection follows actual pixels - drag anywhere freely!</p>
                <p className="text-yellow-400 font-semibold">💡 CLICK image pixels only • DRAG unrestricted across canvas</p>
                <p className="text-green-400">🎯 Perfect balance: Precise selection + unlimited movement</p>
              </div>
            </div>
          </div>

          {/* Right Panel - Interactive Canvas */}
          <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden min-h-96 lg:min-h-screen">
            <div className="absolute top-4 right-4 bg-black text-white px-4 py-2 text-xs font-bold tracking-wide z-10 rounded">
              PIXEL-PERFECT CANVAS • 3:4 {zoom !== 1 && `• ${Math.round(zoom * 100)}%`}
            </div>
            
            <div className="w-full h-full flex items-center justify-center p-4">
              <div 
                className="relative shadow-2xl"
                style={{ 
                  aspectRatio: '3/4', 
                  width: '100%',
                  maxWidth: '600px',
                  maxHeight: 'calc(100vh - 120px)',
                  overflow: 'hidden', // Clip elements at canvas edges
                  cursor: draggedCanvasElement ? 'grabbing' : zoom > 1 ? 'grab' : 'default'
                }}
                onMouseDown={(e) => {
                  if (!draggedCanvasElement && zoom > 1) {
                    setIsDragging(true)
                    e.preventDefault()
                  }
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedElement) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = ((e.clientX - rect.left) / rect.width) * 100
                    const y = ((e.clientY - rect.top) / rect.height) * 100
                    addElementToCanvas(draggedElement, x, y)
                  }
                }}
              >
                <div 
                  ref={canvasRef}
                  className="collage-canvas bg-white relative w-full h-full"
                  style={{
                    transform: `scale(${zoom}) translate3d(${pan.x / zoom}px, ${pan.y / zoom}px, 0)`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    willChange: isDragging || zoom !== 1 ? 'transform' : 'auto',
                    backfaceVisibility: 'hidden',
                    perspective: 1000,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {/* PIXEL-PERFECT: DOM reordering with pixel-based click detection */}
                  {collageElements
                    .slice() // Create copy to avoid mutating original array
                    .sort((a, b) => a.zIndex - b.zIndex) // Sort by z-index - higher z-index = later in DOM = on top
                    .map((element) => (
                      <PixelPerfectElement
                        key={`${element.id}-${element.x}-${element.y}`}
                        element={element}
                        isSelected={selectedElementId === `${element.id}-${element.x}-${element.y}`}
                        isDraggedElement={draggedCanvasElement === element}
                      />
                    ))}
                  
                  {collageElements.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center p-8">
                        <div className="mb-4">
                          <Sparkles className="mx-auto text-gray-300" size={64} />
                        </div>
                        <p className="text-xl lg:text-2xl mb-3 font-light">Ready to create?</p>
                        <p className="text-base lg:text-lg text-gray-500 mb-4">Generate inspiration to get started</p>
                        <p className="text-sm text-blue-400">🎯 Now with pixel-perfect selection + unlimited dragging!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
