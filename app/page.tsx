'use client'

import { useState, useRef, useEffect } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { Element, CollageElement, SavedCollage } from '@/lib/types'
import { Download, Save, Shuffle, Loader2, Sparkles, Zap, Palette, Globe, Rocket } from 'lucide-react'
import html2canvas from 'html2canvas'

// PRESET COLLAGE STYLES - Each creates a unified, breathtaking composition
const COLLAGE_STYLES = {
  urban: {
    name: "URBAN DREAMS",
    icon: Globe,
    description: "City life and human stories",
    categories: ['architecture', 'people', 'vehicles', 'technology', 'objects'] as string[],
    sceneType: 'urban',
    elementCount: { min: 12, max: 18 },
    color: 'from-blue-600 to-purple-600'
  },
  nature: {
    name: "WILD ESCAPE", 
    icon: Sparkles,
    description: "Natural world and adventure",
    categories: ['nature', 'animals', 'sky', 'landscapes', 'vehicles'] as string[],
    sceneType: 'natural',
    elementCount: { min: 10, max: 16 },
    color: 'from-green-600 to-blue-600'
  },
  retro: {
    name: "RETRO VIBES",
    icon: Zap,
    description: "Vintage nostalgia and memories", 
    categories: ['vintage', 'vehicles', 'people', 'objects', 'architecture'] as string[],
    sceneType: 'nostalgic',
    elementCount: { min: 14, max: 20 },
    color: 'from-orange-600 to-red-600'
  },
  cosmic: {
    name: "COSMIC SURREAL",
    icon: Rocket,
    description: "Dreamlike impossible worlds",
    categories: ['space', 'abstract', 'monuments', 'explosions', 'nature'] as string[],
    sceneType: 'surreal',
    elementCount: { min: 8, max: 14 },
    color: 'from-purple-600 to-pink-600'
  },
  chaos: {
    name: "PURE CHAOS",
    icon: Palette,
    description: "Everything everywhere all at once",
    categories: [] as string[], // Will use all available categories
    sceneType: 'maximalist',
    elementCount: { min: 20, max: 30 },
    color: 'from-red-600 to-yellow-600'
  }
}

export default function CollageRandomizer() {
  const [selectedStyle, setSelectedStyle] = useState('urban')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [collageElements, setCollageElements] = useState<CollageElement[]>([])
  const [availableElements, setAvailableElements] = useState<Element[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadElements()
  }, [])

  const loadElements = async () => {
    try {
      const elements = await dbHelpers.getAllElements()
      setAvailableElements(elements)
      
      const uniqueCategories = Array.from(new Set(elements.map(el => el.category))).sort()
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error loading elements:', error)
    }
  }

  // Professional collage placement following artistic principles
  const getArtisticPlacement = (role: 'foundation' | 'focal' | 'supporting' | 'detail', elementType: string) => {
    if (role === 'foundation') {
      // 1-2 MASSIVE elements that define the scene
      const isVertical = ['architecture', 'monuments', 'landscapes'].includes(elementType)
      return {
        x: -10 + Math.random() * 20,
        y: isVertical ? 15 + Math.random() * 30 : -5 + Math.random() * 20,
        scale: 3.0 + Math.random() * 1.5, // ENORMOUS foundation elements
        rotation: isVertical ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 15,
        opacity: 0.8 + Math.random() * 0.2,
        zIndex: 1 + Math.random() * 3
      }
    } else if (role === 'focal') {
      // 3-5 key elements that tell the story
      return {
        x: 10 + Math.random() * 60,
        y: 15 + Math.random() * 50,
        scale: 1.5 + Math.random() * 1.0, // Large, important elements
        rotation: (Math.random() - 0.5) * 45,
        opacity: 0.9 + Math.random() * 0.1,
        zIndex: 15 + Math.random() * 10
      }
    } else if (role === 'supporting') {
      // 4-8 elements that add context and depth
      return {
        x: Math.random() * 80,
        y: Math.random() * 80,
        scale: 0.8 + Math.random() * 0.8,
        rotation: (Math.random() - 0.5) * 60,
        opacity: 0.7 + Math.random() * 0.3,
        zIndex: 25 + Math.random() * 15
      }
    } else {
      // Details that add texture without overwhelming
      return {
        x: Math.random() * 90,
        y: Math.random() * 90,
        scale: 0.4 + Math.random() * 0.6,
        rotation: (Math.random() - 0.5) * 90,
        opacity: 0.5 + Math.random() * 0.4,
        zIndex: 40 + Math.random() * 10
      }
    }
  }

  // Smart element categorization for artistic placement
  const categorizeForArt = (element: Element): 'foundation' | 'focal' | 'supporting' | 'detail' => {
    const name = element.name.toLowerCase()
    const category = element.category.toLowerCase()
    
    // Foundation elements (1-2 per collage) - define the scene
    const foundationKeywords = ['sky', 'landscape', 'building', 'architecture', 'monument', 'cityscape']
    if (foundationKeywords.some(k => name.includes(k)) || 
        ['architecture', 'monuments', 'landscapes', 'sky'].includes(category)) {
      return 'foundation'
    }
    
    // Focal elements (3-5 per collage) - the main story
    const focalKeywords = ['people', 'person', 'figure', 'animal', 'vehicle', 'car', 'plane']
    if (focalKeywords.some(k => name.includes(k)) || 
        ['people', 'animals', 'vehicles'].includes(category)) {
      return 'focal'
    }
    
    // Supporting elements (4-8 per collage) - context and depth  
    const supportingKeywords = ['object', 'tool', 'furniture', 'statue', 'technology']
    if (supportingKeywords.some(k => name.includes(k)) || 
        ['objects', 'technology', 'statues'].includes(category)) {
      return 'supporting'
    }
    
    // Everything else is detail
    return 'detail'
  }

  const generateMasterpiece = async () => {
    if (availableElements.length === 0) {
      alert('No elements available. Please upload some elements first.')
      return
    }
    
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 800)) // Dramatic pause
    
    try {
      const style = COLLAGE_STYLES[selectedStyle as keyof typeof COLLAGE_STYLES]
      console.log(`🎨 Generating ${style.name} masterpiece...`)
      
      // Get working elements for this style
      let workingElements = availableElements
      if (style.categories.length > 0) {
        workingElements = availableElements.filter(el => style.categories.includes(el.category))
      }
      
      if (workingElements.length === 0) {
        alert(`No elements found for ${style.name}. Upload more diverse content.`)
        return
      }
      
      const elements: CollageElement[] = []
      
      // FOUNDATION LAYER - 1-2 massive scene-defining elements
      const foundationElements = workingElements.filter(el => categorizeForArt(el) === 'foundation')
      if (foundationElements.length > 0) {
        const foundationCount = Math.random() > 0.7 ? 2 : 1 // Usually 1, sometimes 2
        for (let i = 0; i < foundationCount; i++) {
          const element = foundationElements[Math.floor(Math.random() * foundationElements.length)]
          const placement = getArtisticPlacement('foundation', element.category)
          
          elements.push({
            ...element,
            ...placement,
            primary: true
          })
        }
        console.log(`Foundation: ${foundationCount} massive scene elements`)
      }
      
      // FOCAL LAYER - 3-5 key story elements
      const focalElements = workingElements.filter(el => categorizeForArt(el) === 'focal')
      if (focalElements.length > 0) {
        const focalCount = Math.floor(Math.random() * 3) + 3 // 3-5 focal elements
        for (let i = 0; i < focalCount; i++) {
          const element = focalElements[Math.floor(Math.random() * focalElements.length)]
          const placement = getArtisticPlacement('focal', element.category)
          
          elements.push({
            ...element,
            ...placement,
            primary: true
          })
        }
        console.log(`Focal: ${focalCount} story elements`)
      }
      
      // SUPPORTING LAYER - 4-8 context elements
      const supportingElements = workingElements.filter(el => categorizeForArt(el) === 'supporting')
      if (supportingElements.length > 0) {
        const supportingCount = Math.floor(Math.random() * 5) + 4 // 4-8 supporting
        for (let i = 0; i < supportingCount; i++) {
          const element = supportingElements[Math.floor(Math.random() * supportingElements.length)]
          const placement = getArtisticPlacement('supporting', element.category)
          
          elements.push({
            ...element,
            ...placement,
            primary: false
          })
        }
        console.log(`Supporting: ${supportingCount} context elements`)
      }
      
      // DETAIL LAYER - selective details for texture
      const detailElements = workingElements.filter(el => categorizeForArt(el) === 'detail')
      const targetTotal = Math.floor(Math.random() * (style.elementCount.max - style.elementCount.min + 1)) + style.elementCount.min
      const currentCount = elements.length
      const detailsNeeded = Math.max(0, targetTotal - currentCount)
      
      if (detailElements.length > 0 && detailsNeeded > 0) {
        for (let i = 0; i < detailsNeeded; i++) {
          const element = detailElements[Math.floor(Math.random() * detailElements.length)]
          const placement = getArtisticPlacement('detail', element.category)
          
          elements.push({
            ...element,
            ...placement,
            primary: false
          })
        }
        console.log(`Details: ${detailsNeeded} texture elements`)
      }
      
      // Sort by z-index for proper layering
      elements.sort((a, b) => a.zIndex - b.zIndex)
      
      console.log(`🔥 ${style.name} MASTERPIECE: ${elements.length} perfectly balanced elements`)
      setCollageElements(elements)
      
    } catch (error) {
      console.error('Error generating masterpiece:', error)
      alert('Error generating collage. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveCollage = async () => {
    if (collageElements.length === 0) {
      alert('Generate a masterpiece first!')
      return
    }
    
    setIsSaving(true)
    
    try {
      const style = COLLAGE_STYLES[selectedStyle as keyof typeof COLLAGE_STYLES]
      const title = `${style.name} Masterpiece`
      
      await dbHelpers.saveCollage({
        prompt: title,
        elements_data: collageElements,
        title: title
      })
      
      alert('Masterpiece saved!')
    } catch (error) {
      console.error('Error saving collage:', error)
      alert('Error saving collage. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const exportCollage = async () => {
    if (!canvasRef.current || collageElements.length === 0) {
      alert('Generate a masterpiece first!')
      return
    }
    
    setIsExporting(true)
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 3, // Ultra high resolution
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight
      })
      
      const style = COLLAGE_STYLES[selectedStyle as keyof typeof COLLAGE_STYLES]
      
      const link = document.createElement('a')
      link.download = `${style.name.toLowerCase().replace(/\s+/g, '-')}-masterpiece-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error exporting masterpiece:', error)
      alert('Error exporting masterpiece. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Left Panel - Pure Magic Controls */}
      <div className="w-full lg:w-1/3 bg-black p-6 lg:p-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2 tracking-tight bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            COLLAGE
          </h1>
          <h2 className="text-xl lg:text-2xl font-light tracking-wider text-gray-300">
            MASTERPIECE GENERATOR
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-600 to-orange-600 mt-4"></div>
        </div>
        
        <div className="flex-1 space-y-6">
          {/* Style Selection */}
          <div>
            <label className="text-sm font-bold mb-4 block text-gray-400 tracking-wide">
              CHOOSE YOUR ARTISTIC VISION
            </label>
            <div className="space-y-3">
              {Object.entries(COLLAGE_STYLES).map(([key, style]) => {
                const IconComponent = style.icon
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedStyle(key)}
                    className={`w-full p-4 text-left border-2 transition-all duration-300 group ${
                      selectedStyle === key 
                        ? `bg-gradient-to-r ${style.color} border-transparent text-white shadow-xl transform scale-105` 
                        : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent size={24} className={selectedStyle === key ? 'text-white' : 'text-gray-400'} />
                      <div>
                        <div className="font-bold text-lg">{style.name}</div>
                        <div className={`text-sm ${selectedStyle === key ? 'text-gray-100' : 'text-gray-500'}`}>
                          {style.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* The Magic Button */}
          <button
            onClick={generateMasterpiece}
            disabled={isGenerating || availableElements.length === 0}
            className={`w-full p-6 text-xl font-bold transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
              isGenerating 
                ? 'bg-gray-600' 
                : `bg-gradient-to-r ${COLLAGE_STYLES[selectedStyle as keyof typeof COLLAGE_STYLES].color} hover:shadow-2xl hover:scale-105 transform`
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                CREATING MAGIC...
              </>
            ) : (
              <>
                <Sparkles size={24} />
                GENERATE MASTERPIECE
              </>
            )}
          </button>
          
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

          {/* Zoom Controls */}
          {collageElements.length > 0 && (
            <div className="border-t border-gray-800 pt-6">
              <h3 className="font-bold mb-3 tracking-wide text-gray-400">FINE-TUNE YOUR MASTERPIECE</h3>
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

          {/* Current Selection Display */}
          {collageElements.length > 0 && (
            <div className="border-t border-gray-800 pt-4">
              <h3 className="font-bold mb-3 tracking-wide text-green-400">MASTERPIECE STATS</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Style:</span> {COLLAGE_STYLES[selectedStyle as keyof typeof COLLAGE_STYLES].name}
                </div>
                <div>
                  <span className="text-gray-400">Elements:</span> {collageElements.length} perfectly balanced
                </div>
                <div>
                  <span className="text-gray-400">Primary:</span> {collageElements.filter(el => el.primary).length} focal points
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 border-t border-gray-800 pt-4">
          <div className="text-center">
            <p className="font-bold text-gray-400">{availableElements.length.toLocaleString()} ELEMENTS READY</p>
            <p className="text-gray-600">One click. Pure magic. 🔥</p>
          </div>
        </div>
      </div>

      {/* Right Panel - The Canvas */}
      <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden min-h-96 lg:min-h-screen">
        <div className="absolute top-4 right-4 bg-black text-white px-4 py-2 text-xs font-bold tracking-wide z-10 rounded">
          MASTERPIECE CANVAS • 3:4 {zoom !== 1 && `• ${Math.round(zoom * 100)}%`}
        </div>
        
        <div className="w-full h-full flex items-center justify-center p-4">
          <div 
            className="relative shadow-2xl"
            style={{ 
              aspectRatio: '3/4', 
              width: '100%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 120px)',
              overflow: 'hidden',
              cursor: zoom > 1 ? 'grab' : 'default'
            }}
            onMouseDown={(e) => {
              if (zoom > 1) {
                setIsDragging(true)
                e.preventDefault()
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && zoom > 1) {
                setPan(prev => ({
                  x: prev.x + e.movementX,
                  y: prev.y + e.movementY
                }))
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <div 
              ref={canvasRef}
              className="collage-canvas bg-white relative w-full h-full"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {collageElements.map((element, index) => (
                <div
                  key={`${element.id}-${index}-${element.x}-${element.y}`}
                  className="collage-element absolute"
                  style={{
                    left: `${element.x}%`,
                    top: `${element.y}%`,
                    transform: `rotate(${element.rotation}deg) scale(${element.scale})`,
                    opacity: element.opacity,
                    zIndex: element.zIndex,
                    transformOrigin: 'center'
                  }}
                >
                  <img
                    src={element.file_url}
                    alt={element.name}
                    className="max-w-32 max-h-32 lg:max-w-40 lg:max-h-40 object-contain drop-shadow-lg"
                    loading="eager"
                    crossOrigin="anonymous"
                  />
                  {element.primary && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-lg"></div>
                  )}
                </div>
              ))}
              
              {collageElements.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center p-8">
                    <Sparkles className="mx-auto mb-4 text-gray-300" size={64} />
                    <p className="text-xl lg:text-2xl mb-3 font-light">Ready to create magic?</p>
                    <p className="text-base lg:text-lg text-gray-500 mb-4">Choose your style and generate a masterpiece</p>
                    {availableElements.length === 0 && (
                      <p className="text-sm text-red-400">
                        No elements available. Visit <a href="/admin" className="underline hover:text-red-300">admin</a> to upload.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
