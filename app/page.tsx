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
          src={element.url}
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
      
      {/* Loading/error indicators */}
      {shouldLoad && (
        <div className="absolute bottom-1 left-1">
          {!loaded && !error && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
          {loaded && <div className="w-2 h-2 bg-green-400 rounded-full" />}
          {error && <div className="w-2 h-2 bg-red-400 rounded-full" />}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
        <div className="transform scale-0 group-hover:scale-100 transition-transform">
          <Plus className="text-white w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

export default function CollageMaker() {
  // State management
  const [availableElements, setAvailableElements] = useState<Element[]>([])
  const [collageElements, setCollageElements] = useState<CollageElement[]>([])
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

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load elements from database
  const loadElements = async () => {
    try {
      setIsLoadingElements(true)
      console.log('🎯 Loading elements...')
      
      const allElements = await dbHelpers.getAllElements()
      console.log(`✅ Loaded ${allElements.length} total elements`)
      
      // Filter out mock categories
      const filteredElements = allElements.filter(el => {
        const name = el.name.toLowerCase()
        const category = el.category?.toLowerCase() || ''
        
        // Remove mock categories
        const mockCategories = ['explosions', 'nature', 'statues']
        if (mockCategories.includes(category)) return false
        
        // Remove
