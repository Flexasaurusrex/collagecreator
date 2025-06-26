'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [draggedElement, setDraggedElement] = useState<Element | null>(null)
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

  // PERFECTED collage generation logic (based on Wild Escape success)
  const getFoundationalPlacement = (role: 'sky' | 'ground' | 'midground' | 'foreground') => {
    if (role === 'sky') {
      return {
        x: -20 + Math.random() * 40, // Can extend beyond canvas
        y: -10 + Math.random() * 20, // TOP 30% only
        scale: 4.5 + Math.random() * 2.0, // MASSIVE sky (4.5x-6.5x)
        rotation: (Math.random() - 0.5) * 8, // Minimal rotation
        opacity: 0.85 + Math.random() * 0.15,
        zIndex: 1
      }
    } else if (role === 'ground') {
      return {
        x: -20 + Math.random() * 40, // Can extend beyond
        y: 40 + Math.random() * 40, // BOTTOM 60% 
        scale: 3.8 + Math.random() * 1.8, // MASSIVE ground (3.8x-5.6x)
        rotation: (Math.random() - 0.5) * 6, // VERY minimal tilt
        opacity: 0.9 + Math.random() * 0.1,
        zIndex: 2 + Math.random() * 2
      }
    } else if (role === 'midground') {
      return {
        x: 5 + Math.random() * 70,
        y: 25 + Math.random() * 50,
        scale: 1.8 + Math.random() * 1.2, // Medium (1.8x-3x)
        rotation: (Math.random() - 0.5) * 35,
        opacity: 0.8 + Math.random() * 0.2,
        zIndex: 10 + Math.random() * 8
      }
    } else {
      return {
        x: 10 + Math.random() * 80,
        y: 15 + Math.random() * 70,
        scale: 0.9 + Math.random() * 1.0, // Small foreground (0.9x-1.9x)
        rotation: (Math.random() - 0.5) * 60,
        opacity: 0.75 + Math.random() * 0.25,
        zIndex: 20 + Math.random() * 15
      }
    }
  }

  const identifyElementRole = (element: Element): 'sky' | 'ground' | 'midground' | 'foreground' => {
    const name = element.name.toLowerCase()
    const category = element.category.toLowerCase()
    
    // SKY elements
    const skyKeywords = ['sky', 'cloud', 'sunset', 'sunrise', 'horizon', 'space', 'star', 'moon', 'sun']
    if (skyKeywords.some(keyword => name.includes(keyword)) || ['sky', 'space'].includes(category)) {
      return 'sky'
    }
    
    // GROUND elements (buildings, architecture, landscapes)
    const groundKeywords = ['building', 'architecture', 'landscape', 'city', 'house', 'structure', 'monument']
    if (groundKeywords.some(keyword => name.includes(keyword)) || 
        ['architecture', 'buildings', 'landscapes', 'monuments'].includes(category)) {
      return 'ground'
    }
    
    // MIDGROUND (people, vehicles, large objects)
    const midgroundKeywords = ['people', 'person', 'vehicle', 'car', 'animal', 'statue']
    if (midgroundKeywords.some(keyword => name.includes(keyword)) || 
        ['people', 'vehicles', 'animals', 'statues'].includes(category)) {
      return 'midground'
    }
    
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
      console.log('🎨 Generating artistic inspiration...')
      
      const elements: CollageElement[] = []
      
      // SKY FOUNDATION - 1 massive element
      const skyElements = availableElements.filter(el => identifyElementRole(el) === 'sky')
      if (skyElements.length > 0) {
        const element = skyElements[Math.floor(Math.random() * skyElements.length)]
        const placement = getFoundationalPlacement('sky')
        
        elements.push({
          ...element,
          ...placement,
          primary: true
        })
        console.log('🌌 Placed massive sky foundation')
      }
      
      // GROUND FOUNDATION - 1-2 massive elements
      const groundElements = availableElements.filter(el => identifyElementRole(el) === 'ground')
      if (groundElements.length > 0) {
        const groundCount = Math.random() > 0.6 ? 2 : 1
        for (let i = 0; i < groundCount; i++) {
          const element = groundElements[Math.floor(Math.random() * groundElements.length)]
          const placement = getFoundationalPlacement('ground')
          
          elements.push({
            ...element,
            ...placement,
            primary: true
          })
        }
        console.log(`🏗️ Placed ${groundCount} massive ground foundation(s)`)
      }
      
      // MIDGROUND LAYER - 2-4 medium elements
      const midgroundElements = availableElements.filter(el => identifyElementRole(el) === 'midground')
      if (midgroundElements.length > 0) {
        const midCount = Math.floor(Math.random() * 3) + 2 // 2-4 elements
        for (let i = 0; i < midCount; i++) {
          const element = midgroundElements[Math.floor(Math.random() * midgroundElements.length)]
          const placement = getFoundationalPlacement('midground')
          
          elements.push({
            ...element,
            ...placement,
            primary: i === 0
          })
        }
        console.log(`🎯 Placed ${midCount} midground elements`)
      }
      
      // FOREGROUND DETAILS - 3-6 small elements
      const foregroundElements = availableElements.filter(el => identifyElementRole(el) === 'foreground')
      if (foregroundElements.length > 0) {
        const foregroundCount = Math.floor(Math.random() * 4) + 3 // 3-6 elements
        for (let i = 0; i < foregroundCount; i++) {
          const element = foregroundElements[Math.floor(Math.random() * foregroundElements.length)]
          const placement = getFoundationalPlacement('foreground')
          
          elements.push({
            ...element,
            ...placement,
            primary: false
          })
        }
        console.log(`✨ Placed ${foregroundCount} foreground details`)
      }
      
      // Sort by z-index
      elements.sort((a, b) => a.zIndex - b.zIndex)
      
      console.log(`🔥 INSPIRATION READY: ${elements.length} elements with perfect hierarchy`)
      setCollageElements(elements)
      
    } catch (error) {
      console.error('Error generating inspiration:', error)
      alert('Error generating inspiration. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const addElementToCanvas = (element: Element, x: number = 50, y: number = 50) => {
    const newElement: CollageElement = {
      ...element,
      x: x,
      y: y,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
      zIndex: Math.max(...collageElements.map(el => el.zIndex), 0) + 1,
      primary: false
    }
    
    setCollageElements(prev => [...prev, newElement])
  }

  const deleteElement = (elementToDelete: CollageElement) => {
    setCollageElements(prev => prev.filter(el => 
      !(el.id === elementToDelete.id && el.x === elementToDelete.x && el.y === elementToDelete.y)
    ))
    setSelectedElementId(null)
  }

  const updateElement = (elementToUpdate: CollageElement, updates: Partial<CollageElement>) => {
    setCollageElements(prev => prev.map(el => 
      (el.id === elementToUpdate.id && el.x === elementToUpdate.x && el.y === elementToUpdate.y) 
        ? { ...el, ...updates }
        : el
    ))
  }

  const getFilteredElements = () => {
    if (selectedCategory === 'all') return availableElements
    return availableElements.filter(el => el.category === selectedCategory)
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

  const selectedElement = selectedElementId 
    ? collageElements.find(el => `${el.id}-${el.x}-${el.y}` === selectedElementId)
    : null

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Left Panel - Creation Tools */}
      <div className="w-full lg:w-1/3 bg-black p-6 lg:p-8 flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2 tracking-tight bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
            COLLAGE
          </h1>
          <h2 className="text-xl lg:text-2xl font-light tracking-wider text-gray-300">
            CREATOR
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-green-600 to-blue-600 mt-4"></div>
        </div>
        
        <div className="flex-1 space-y-6">
          {/* Generate Inspiration */}
          <div>
            <button
              onClick={generateInspiration}
              disabled={isGenerating || availableElements.length === 0}
              className={`w-full p-5 text-lg font-bold transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                isGenerating 
                  ? 'bg-gray-600' 
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:shadow-2xl hover:scale-105 transform'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  GENERATING...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  GENERATE INSPIRATION
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Creates a foundation to build upon
            </p>
          </div>

          {/* Element Library */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen size={18} className="text-blue-400" />
              <label className="text-sm font-bold text-gray-400 tracking-wide">
                ELEMENT LIBRARY
              </label>
            </div>
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 text-white mb-4 text-sm"
            >
              <option value="all">All Categories ({availableElements.length})</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({availableElements.filter(el => el.category === category).length})
                </option>
              ))}
            </select>

            {/* Elements Grid */}
            <div className="max-h-80 overflow-y-auto border border-gray-700 bg-gray-900 p-2">
              <div className="grid grid-cols-3 gap-2">
                {getFilteredElements().slice(0, 50).map(element => (
                  <div
                    key={element.id}
                    draggable
                    onDragStart={() => setDraggedElement(element)}
                    onDragEnd={() => setDraggedElement(null)}
                    onClick={() => addElementToCanvas(element)}
                    className="aspect-square bg-gray-800 border border-gray-600 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:scale-105 p-1 group"
                    title={`${element.name} - Click to add or drag to canvas`}
                  >
                    <img
                      src={element.file_url}
                      alt={element.name}
                      className="w-full h-full object-contain group-hover:opacity-80"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  </div>
                ))}
              </div>
              {getFilteredElements().length > 50 && (
                <div className="text-center text-xs text-gray-500 mt-2">
                  Showing first 50 elements
                </div>
              )}
            </div>
          </div>

          {/* Element Editor */}
          {selectedElement && (
            <div className="border-t border-gray-800 pt-4">
              <h3 className="font-bold mb-3 tracking-wide text-yellow-400">ELEMENT EDITOR</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">SCALE</label>
                  <input
                    type="range"
                    min="0.2"
                    max="6"
                    step="0.1"
                    value={selectedElement.scale}
                    onChange={(e) => updateElement(selectedElement, { scale: parseFloat(e.target.value) })}
                    className="w-full"
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
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">{selectedElement.rotation}°</div>
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
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">{Math.round(selectedElement.opacity * 100)}%</div>
                </div>
                
                <button
                  onClick={() => deleteElement(selectedElement)}
                  className="w-full bg-red-600 hover:bg-red-700 p-2 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  DELETE ELEMENT
                </button>
              </div>
            </div>
          )}
          
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
            <p className="font-bold text-gray-400">{availableElements.length.toLocaleString()} ELEMENTS • {collageElements.length} ON CANVAS</p>
            <p className="text-gray-600">Generate inspiration, then create your masterpiece</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Interactive Canvas */}
      <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden min-h-96 lg:min-h-screen">
        <div className="absolute top-4 right-4 bg-black text-white px-4 py-2 text-xs font-bold tracking-wide z-10 rounded">
          CREATION CANVAS • 3:4 {zoom !== 1 && `• ${Math.round(zoom * 100)}%`}
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
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
            >
              {collageElements.map((element, index) => {
                const elementId = `${element.id}-${element.x}-${element.y}`
                const isSelected = selectedElementId === elementId
                
                return (
                  <div
                    key={elementId}
                    className={`collage-element absolute cursor-pointer transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-white' : 'hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 hover:ring-offset-white'
                    }`}
                    style={{
                      left: `${element.x}%`,
                      top: `${element.y}%`,
                      transform: `rotate(${element.rotation}deg) scale(${element.scale})`,
                      opacity: element.opacity,
                      zIndex: element.zIndex,
                      transformOrigin: 'center'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedElementId(selectedElementId === elementId ? null : elementId)
                    }}
                  >
                    <img
                      src={element.file_url}
                      alt={element.name}
                      className="max-w-48 max-h-48 lg:max-w-64 lg:max-h-64 object-contain drop-shadow-lg"
                      loading="eager"
                      crossOrigin="anonymous"
                    />
                    {element.primary && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full shadow-lg"></div>
                    )}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                )
              })}
              
              {collageElements.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center p-8">
                    <div className="mb-4">
                      <Sparkles className="mx-auto text-gray-300" size={64} />
                    </div>
                    <p className="text-xl lg:text-2xl mb-3 font-light">Ready to create?</p>
                    <p className="text-base lg:text-lg text-gray-500 mb-4">Generate inspiration or drag elements from the library</p>
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
