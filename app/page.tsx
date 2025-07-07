'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { Element, CollageElement, SavedCollage } from '@/lib/types'
import { Download, Save, Shuffle, Loader2, Sparkles, Trash2, RotateCcw, Move, Plus, FolderOpen, Waves } from 'lucide-react'
import html2canvas from 'html2canvas'

// Animation types
type AnimationSquare = {
  x: number
  y: number
  color: string
  delay: number
  duration: number
}

export default function CollageCreator() {
  // Core state
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
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationGrid, setAnimationGrid] = useState<AnimationSquare[]>([])
  const [animationIntensity, setAnimationIntensity] = useState(50)
  const [animationSpeed, setAnimationSpeed] = useState(50)
  const [animationMode, setAnimationMode] = useState<'wave' | 'pixelate' | 'rainbow'>('wave')
  
  // Loading state
  const [visibleElementsCount, setVisibleElementsCount] = useState(24)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalElementCount, setTotalElementCount] = useState(0)
  
  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [draggedElement, setDraggedElement] = useState<Element | null>(null)
  const [draggedCanvasElement, setDraggedCanvasElement] = useState<CollageElement | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Compute selected element
  const selectedElement = selectedElementId 
    ? collageElements.find(el => `${el.id}-${el.x}-${el.y}` === selectedElementId)
    : null

  // Filter elements
  const filteredElements = useMemo(() => {
    if (selectedCategory === 'all') return availableElements
    return availableElements.filter(el => el.category === selectedCategory)
  }, [availableElements, selectedCategory])

  // Effects
  useEffect(() => {
    loadElements()
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setVisibleElementsCount(mobile ? 18 : 24)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load elements
  const loadElements = async () => {
    try {
      const allElements = await dbHelpers.getAllElements()
      setAvailableElements(allElements)
      setTotalElementCount(allElements.length)
      
      const allCategories = Array.from(new Set(allElements.map(el => el.category))).sort()
      setCategories(allCategories)
    } catch (error) {
      console.error('Error loading elements:', error)
    }
  }

  // Simple generation for testing
  const generateInspiration = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      alert('Generation complete!')
    }, 1000)
  }

  // Render
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Collage Creator Test</h1>
        <button
          onClick={generateInspiration}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
        <div className="mt-4">
          <p>Elements loaded: {availableElements.length}</p>
          <p>Categories: {categories.length}</p>
        </div>
      </div>
    </div>
  )
}
