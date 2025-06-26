'use client'

import { useState, useRef, useEffect } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { Element, CollageElement, SavedCollage } from '@/lib/types'
import { Download, Save, History, Shuffle, Loader2, Palette, Layout } from 'lucide-react'
import html2canvas from 'html2canvas'

// Compositional templates based on professional collage styles
const COMPOSITION_TEMPLATES = {
  landscape: {
    name: "LANDSCAPE",
    description: "Horizontal environmental scenes",
    backgroundAreas: [
      { x: 0, y: 0, width: 100, height: 40, priority: 'sky' },
      { x: 0, y: 30, width: 100, height: 70, priority: 'ground' }
    ],
    focalPoints: [{ x: 65, y: 45 }, { x: 25, y: 55 }],
    layering: ['nature', 'architecture', 'objects', 'people', 'animals']
  },
  portrait: {
    name: "PORTRAIT", 
    description: "Vertical figure compositions",
    backgroundAreas: [
      { x: 0, y: 0, width: 100, height: 100, priority: 'background' }
    ],
    focalPoints: [{ x: 50, y: 35 }, { x: 50, y: 65 }],
    layering: ['nature', 'architecture', 'people', 'animals', 'objects']
  },
  surreal: {
    name: "SURREAL",
    description: "Dreamlike impossible scenes", 
    backgroundAreas: [
      { x: 0, y: 0, width: 100, height: 60, priority: 'sky' },
      { x: 0, y: 40, width: 100, height: 60, priority: 'ground' }
    ],
    focalPoints: [{ x: 50, y: 50 }],
    layering: ['space', 'nature', 'architecture', 'abstract', 'objects']
  },
  vintage: {
    name: "VINTAGE",
    description: "Retro nostalgic compositions",
    backgroundAreas: [
      { x: 0, y: 0, width: 100, height: 100, priority: 'vintage' }
    ],
    focalPoints: [{ x: 30, y: 40 }, { x: 70, y: 60 }],
    layering: ['vintage', 'vehicles', 'people', 'architecture', 'objects']
  },
  chaos: {
    name: "CHAOS",
    description: "Dense overlapping collage",
    backgroundAreas: [
      { x: 0, y: 0, width: 100, height: 100, priority: 'mixed' }
    ],
    focalPoints: [{ x: 50, y: 50 }],
    layering: ['nature', 'abstract', 'objects', 'people', 'animals', 'explosions']
  }
}

// Color palettes that work well together
const COLOR_PALETTES = {
  warm: {
    name: "WARM",
    description: "Oranges, reds, yellows",
    keywords: ['sunset', 'fire', 'desert', 'autumn', 'warm', 'orange', 'red', 'yellow']
  },
  cool: {
    name: "COOL", 
    description: "Blues, greens, purples",
    keywords: ['sky', 'ocean', 'forest', 'blue', 'green', 'purple', 'cool', 'water']
  },
  monochrome: {
    name: "MONO",
    description: "Black, white, grays",
    keywords: ['black', 'white', 'gray', 'mono', 'noir', 'vintage']
  },
  vibrant: {
    name: "VIBRANT",
    description: "Bright saturated colors",
    keywords: ['neon', 'bright', 'vibrant', 'electric', 'pop', 'colorful']
  },
  earthy: {
    name: "EARTHY",
    description: "Browns, greens, naturals", 
    keywords: ['earth', 'nature', 'brown', 'green', 'natural', 'organic']
  },
  mixed: {
    name: "MIXED",
    description: "All colors welcome",
    keywords: []
  }
}

export default function CollageRandomizer() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('landscape')
  const [selectedPalette, setSelectedPalette] = useState('mixed')
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
      
      // Auto-select first few categories
      setSelectedCategories(uniqueCategories.slice(0, 3))
    } catch (error) {
      console.error('Error loading elements:', error)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  // Filter elements by color palette using filename/tag analysis
  const filterByColorPalette = (elements: Element[], palette: string): Element[] => {
    if (palette === 'mixed') return elements
    
    const paletteData = COLOR_PALETTES[palette as keyof typeof COLOR_PALETTES]
    if (!paletteData || paletteData.keywords.length === 0) return elements
    
    return elements.filter(element => {
      const searchText = `${element.name} ${element.tags.join(' ')}`.toLowerCase()
      return paletteData.keywords.some(keyword => searchText.includes(keyword))
    })
  }

  // Smart element placement based on composition template
  const getSmartPlacement = (template: any, elementType: string, isBackground: boolean, focalIndex?: number) => {
    if (isBackground) {
      // Background elements fill designated areas
      const area = template.backgroundAreas[Math.floor(Math.random() * template.backgroundAreas.length)]
      return {
        x: area.x + Math.random() * (area.width - 20),
        y: area.y + Math.random() * (area.height - 20),
        scale: 1.2 + Math.random() * 0.8, // Large backgrounds
        rotation: (Math.random() - 0.5) * 20
      }
    } else if (focalIndex !== undefined && template.focalPoints[focalIndex]) {
      // Focal elements placed near focal points
      const focal = template.focalPoints[focalIndex]
      return {
        x: focal.x + (Math.random() - 0.5) * 30,
        y: focal.y + (Math.random() - 0.5) * 30, 
        scale: 0.8 + Math.random() * 0.6,
        rotation: (Math.random() - 0.5) * 45
      }
    } else {
      // Supporting elements scattered but following composition
      return {
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        scale: 0.4 + Math.random() * 0.8,
        rotation: (Math.random() - 0.5) * 90
      }
    }
  }

  // Get z-index based on template layering order
  const getTemplateZIndex = (template: any, category: string, isBackground: boolean): number => {
    if (isBackground) return 1 + Math.random() * 3
    
    const layerIndex = template.layering.indexOf(category)
    const baseZ = layerIndex >= 0 ? layerIndex * 5 + 10 : 25
    return baseZ + Math.random() * 4
  }

  const generateCollage = async () => {
    if (availableElements.length === 0) {
      alert('No elements available. Please upload some elements first.')
      return
    }
    
    if (selectedCategories.length === 0) {
      alert('Please select at least one category.')
      return
    }
    
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    try {
      const template = COMPOSITION_TEMPLATES[selectedTemplate as keyof typeof COMPOSITION_TEMPLATES]
      console.log(`Generating ${template.name} composition with palette: ${selectedPalette}`)
      
      // Filter available elements by selected categories and color palette
      let workingElements = availableElements.filter(el => selectedCategories.includes(el.category))
      workingElements = filterByColorPalette(workingElements, selectedPalette)
      
      console.log(`Working with ${workingElements.length} elements from categories:`, selectedCategories)
      
      if (workingElements.length === 0) {
        alert('No elements found for selected categories and color palette. Try different selections.')
        return
      }
      
      const elements: CollageElement[] = []
      
      // STEP 1: Place background elements according to template
      const backgroundCategories = template.layering.slice(0, 2) // First 2 categories are background
      const bgElements = workingElements.filter(el => backgroundCategories.includes(el.category))
      
      // Place 3-5 large background elements
      const bgCount = Math.floor(Math.random() * 3) + 3
      for (let i = 0; i < bgCount && bgElements.length > 0; i++) {
        const element = bgElements[Math.floor(Math.random() * bgElements.length)]
        const placement = getSmartPlacement(template, element.category, true)
        
        elements.push({
          ...element,
          ...placement,
          opacity: 0.6 + Math.random() * 0.3,
          zIndex: getTemplateZIndex(template, element.category, true),
          primary: true
        })
      }
      
      // STEP 2: Place focal elements at designated focal points
      const focalCategories = template.layering.slice(2, 4) // Middle categories for focal points
      const focalElements = workingElements.filter(el => focalCategories.includes(el.category))
      
      template.focalPoints.forEach((focal, index) => {
        if (focalElements.length === 0) return
        
        // Place 1-2 elements per focal point
        const focalCount = Math.floor(Math.random() * 2) + 1
        for (let i = 0; i < focalCount; i++) {
          const element = focalElements[Math.floor(Math.random() * focalElements.length)]
          const placement = getSmartPlacement(template, element.category, false, index)
          
          elements.push({
            ...element,
            ...placement,
            opacity: 0.8 + Math.random() * 0.2,
            zIndex: getTemplateZIndex(template, element.category, false),
            primary: true
          })
        }
      })
      
      // STEP 3: Fill with supporting elements following template layering
      const supportingCount = Math.floor(Math.random() * 15) + 20 // 20-34 supporting elements
      for (let i = 0; i < supportingCount; i++) {
        const element = workingElements[Math.floor(Math.random() * workingElements.length)]
        const placement = getSmartPlacement(template, element.category, false)
        
        elements.push({
          ...element,
          ...placement,
          opacity: 0.4 + Math.random() * 0.6,
          zIndex: getTemplateZIndex(template, element.category, false),
          primary: false
        })
      }
      
      // STEP 4: Add density layer for chaos template
      if (selectedTemplate === 'chaos') {
        const chaosCount = Math.floor(Math.random() * 20) + 15
        for (let i = 0; i < chaosCount; i++) {
          const element = workingElements[Math.floor(Math.random() * workingElements.length)]
          
          elements.push({
            ...element,
            x: Math.random() * 95,
            y: Math.random() * 95,
            scale: 0.3 + Math.random() * 0.9,
            rotation: Math.random() * 360,
            opacity: 0.3 + Math.random() * 0.7,
            zIndex: Math.random() * 40,
            primary: false
          })
        }
      }
      
      // Sort by z-index for proper layering
      elements.sort((a, b) => a.zIndex - b.zIndex)
      
      console.log(`Generated composition with ${elements.length} elements`)
      setCollageElements(elements)
      
    } catch (error) {
      console.error('Error generating collage:', error)
      alert('Error generating collage. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveCollage = async () => {
    if (collageElements.length === 0) {
      alert('Generate a collage first!')
      return
    }
    
    setIsSaving(true)
    
    try {
      const title = `${COMPOSITION_TEMPLATES[selectedTemplate as keyof typeof COMPOSITION_TEMPLATES].name} • ${COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES].name}`
      
      await dbHelpers.saveCollage({
        prompt: title,
        elements_data: collageElements,
        title: title
      })
      
      alert('Collage saved successfully!')
    } catch (error) {
      console.error('Error saving collage:', error)
      alert('Error saving collage. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const exportCollage = async () => {
    if (!canvasRef.current || collageElements.length === 0) {
      alert('Generate a collage first!')
      return
    }
    
    setIsExporting(true)
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight
      })
      
      const template = COMPOSITION_TEMPLATES[selectedTemplate as keyof typeof COMPOSITION_TEMPLATES]
      const palette = COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES]
      
      const link = document.createElement('a')
      link.download = `collage-${template.name.toLowerCase()}-${palette.name.toLowerCase()}-${Date.now()}.png`
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
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Panel - Controls */}
      <div className="w-full lg:w-1/3 bg-black text-white p-6 lg:p-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2 tracking-tight">COLLAGE</h1>
          <h2 className="text-xl lg:text-2xl font-light tracking-wider">COMPOSER</h2>
          <div className="w-16 h-1 bg-red-600 mt-4"></div>
        </div>
        
        <div className="flex-1 space-y-6">
          {/* Composition Template */}
          <div>
            <label className="form-label flex items-center gap-2">
              <Layout size={16} />
              COMPOSITION STYLE
            </label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {Object.entries(COMPOSITION_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key)}
                  className={`p-3 text-left border transition-colors ${
                    selectedTemplate === key 
                      ? 'bg-red-600 border-red-600 text-white' 
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-bold text-sm">{template.name}</div>
                  <div className="text-xs opacity-75">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="form-label flex items-center gap-2">
              <Palette size={16} />
              COLOR PALETTE
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPalette(key)}
                  className={`p-2 text-left border transition-colors ${
                    selectedPalette === key 
                      ? 'bg-yellow-600 border-yellow-600 text-black' 
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-bold text-xs">{palette.name}</div>
                  <div className="text-xs opacity-75">{palette.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="form-label">
              CATEGORIES ({selectedCategories.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-700 bg-gray-900 p-2 mt-2">
              <div className="space-y-1">
                {categories.map(category => (
                  <label key={category} className="flex items-center gap-2 p-2 hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4 accent-red-600"
                    />
                    <span className="text-sm capitalize">
                      {category} ({availableElements.filter(el => el.category === category).length})
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSelectedCategories(categories)}
                className="bg-gray-800 px-3 py-1 text-xs hover:bg-gray-700"
              >
                SELECT ALL
              </button>
              <button
                onClick={() => setSelectedCategories([])}
                className="bg-gray-800 px-3 py-1 text-xs hover:bg-gray-700"
              >
                CLEAR ALL
              </button>
            </div>
          </div>
          
          <button
            onClick={generateCollage}
            disabled={isGenerating || availableElements.length === 0 || selectedCategories.length === 0}
            className="w-full btn-primary p-4 text-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                COMPOSING...
              </>
            ) : (
              <>
                <Shuffle size={20} />
                GENERATE COMPOSITION
              </>
            )}
          </button>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={saveCollage}
              disabled={collageElements.length === 0 || isSaving}
              className="btn-secondary p-3 flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              SAVE
            </button>
            <button
              onClick={exportCollage}
              disabled={collageElements.length === 0 || isExporting}
              className="btn-secondary p-3 flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              EXPORT
            </button>
          </div>

          {/* Zoom Controls */}
          {collageElements.length > 0 && (
            <div className="border-t border-gray-800 pt-4">
              <h3 className="font-bold mb-3 tracking-wide text-red-400">COMPOSITION</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-12">ZOOM:</span>
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="bg-gray-800 px-3 py-1 text-sm hover:bg-gray-700"
                  >
                    -
                  </button>
                  <span className="bg-gray-800 px-3 py-1 text-sm min-w-16 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    className="bg-gray-800 px-3 py-1 text-sm hover:bg-gray-700"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => {
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                  }}
                  className="w-full bg-gray-800 p-2 text-sm hover:bg-gray-700"
                >
                  RESET VIEW
                </button>
                <p className="text-xs text-gray-400">
                  Fine-tune composition before export
                </p>
              </div>
            </div>
          )}

          {/* Current Selection Display */}
          {selectedCategories.length > 0 && (
            <div className="border-t border-gray-800 pt-4">
              <h3 className="font-bold mb-3 tracking-wide text-green-400">ACTIVE SELECTION</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-400">Style:</span> {COMPOSITION_TEMPLATES[selectedTemplate as keyof typeof COMPOSITION_TEMPLATES].name}
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">Palette:</span> {COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES].name}
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedCategories.map(category => (
                    <span key={category} className="bg-green-600 px-2 py-1 text-xs font-bold rounded-sm">
                      {category.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 border-t border-gray-800 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold">ELEMENTS: {availableElements.length.toLocaleString()}</p>
              <p>CATEGORIES: {categories.length}</p>
            </div>
            <div>
              <p className="font-bold">ACTIVE: {collageElements.length}</p>
              <p>PRIMARY: {collageElements.filter(el => el.primary).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Canvas */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden min-h-96 lg:min-h-screen">
        <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 text-xs font-bold tracking-wide z-10">
          PORTRAIT • 3:4 {zoom !== 1 && `• ${Math.round(zoom * 100)}%`}
        </div>
        
        <div className="w-full h-full flex items-center justify-center p-4">
          <div 
            className="relative"
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
              className="collage-canvas bg-white shadow-2xl relative w-full h-full"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
            >
              {collageElements.map((element, index) => (
                <div
                  key={`${element.id}-${index}-${element.x}-${element.y}`}
                  className={`collage-element ${element.primary ? 'primary' : 'secondary'}`}
                  style={{
                    left: `${element.x}%`,
                    top: `${element.y}%`,
                    transform: `rotate(${element.rotation}deg) scale(${element.scale})`,
                    opacity: element.opacity,
                    zIndex: element.zIndex,
                  }}
                >
                  <img
                    src={element.file_url}
                    alt={element.name}
                    className="max-w-24 max-h-24 lg:max-w-32 lg:max-h-32 object-contain"
                    loading="eager"
                    crossOrigin="anonymous"
                  />
                  {element.primary && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 bg-red-600 rounded-full"></div>
                  )}
                </div>
              ))}
              
              {collageElements.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center p-8">
                    <div className="text-4xl lg:text-6xl mb-4">◯</div>
                    <p className="text-lg lg:text-xl mb-2">Select categories and style</p>
                    <p className="text-sm lg:text-base">then generate your composition</p>
                    {availableElements.length === 0 && (
                      <p className="text-xs text-red-400 mt-4">
                        No elements available. Visit <a href="/admin" className="underline">admin</a> to upload.
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
}'
