'use client'

import { useState, useRef, useEffect } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { Element, CollageElement, SavedCollage } from '@/lib/types'
import { Download, Save, History, Shuffle, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'

export default function CollageRandomizer() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [collageElements, setCollageElements] = useState<CollageElement[]>([])
  const [availableElements, setAvailableElements] = useState<Element[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [detectedCategories, setDetectedCategories] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadElements()
  }, [])

  useEffect(() => {
    if (prompt) {
      const parsed = parsePrompt(prompt)
      setDetectedCategories(parsed.categories)
    } else {
      setDetectedCategories([])
    }
  }, [prompt, categories])

  const loadElements = async () => {
    try {
      const elements = await dbHelpers.getAllElements()
      setAvailableElements(elements)
      
      const uniqueCategories = Array.from(new Set(elements.map(el => el.category)))
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error loading elements:', error)
    }
  }

  const parsePrompt = (promptText: string): string[] => {
    if (!promptText.trim()) return []
    
    const words = promptText.toLowerCase().split(/[\s,]+/).filter(Boolean)
    const foundCategories = new Set<string>()
    
    // Direct category matches
    categories.forEach(category => {
      if (words.some(word => 
        category.toLowerCase().includes(word) || 
        word.includes(category.toLowerCase())
      )) {
        foundCategories.add(category)
      }
    })
    
    // Enhanced file name and tag matching
    availableElements.forEach(element => {
      const elementWords = [
        ...element.name.toLowerCase().split(/[\s-_]+/),
        ...element.tags.map(tag => tag.toLowerCase())
      ]
      
      // Check for direct matches in file names (more precise)
      const hasDirectMatch = words.some(word => 
        elementWords.some(elementWord => {
          // Exact match or close substring match
          return elementWord === word || 
                 (elementWord.length > 3 && elementWord.includes(word)) ||
                 (word.length > 3 && word.includes(elementWord))
        })
      )
      
      if (hasDirectMatch) {
        foundCategories.add(element.category)
      }
    })
    
    return Array.from(foundCategories)
  }

  const getElementLayer = (element: Element, scale: number, primary: boolean): number => {
    // Base z-index on element type and scale for proper layering
    let baseZIndex = 0
    
    // Background categories (lowest z-index)
    const backgroundCategories = ['nature', 'architecture', 'space', 'vintage']
    if (backgroundCategories.includes(element.category)) {
      baseZIndex = 1
    }
    
    // Mid-ground categories  
    const midgroundCategories = ['statues', 'objects', 'abstract']
    if (midgroundCategories.includes(element.category)) {
      baseZIndex = 10
    }
    
    // Foreground categories (highest z-index)
    const foregroundCategories = ['people', 'animals', 'explosions']
    if (foregroundCategories.includes(element.category)) {
      baseZIndex = 20
    }
    
    // Scale adjustment: larger elements go further back
    const scaleAdjustment = Math.floor((1 - scale) * 10) // Larger scale = lower adjustment
    
    // Primary elements get slight boost to ensure visibility
    const primaryBoost = primary ? 5 : 0
    
    return baseZIndex + scaleAdjustment + primaryBoost + Math.floor(Math.random() * 3)
  }

  const calculateCanvasCoverage = (elements: CollageElement[], canvasWidth: number, canvasHeight: number): number => {
    // Create a grid to track coverage (simplified approach)
    const gridSize = 20 // 20x20 grid for coverage calculation
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false))
    
    elements.forEach(element => {
      // Calculate element boundaries
      const elementWidth = (element.scale * 32) // Approximate element size
      const elementHeight = (element.scale * 32)
      
      const startX = Math.floor((element.x / 100) * gridSize)
      const startY = Math.floor((element.y / 100) * gridSize)
      const endX = Math.min(gridSize - 1, startX + Math.floor((elementWidth / canvasWidth) * gridSize))
      const endY = Math.min(gridSize - 1, startY + Math.floor((elementHeight / canvasHeight) * gridSize))
      
      // Mark grid cells as covered
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          if (y >= 0 && y < gridSize && x >= 0 && x < gridSize) {
            grid[y][x] = true
          }
        }
      }
    })
    
    // Calculate coverage percentage
    const totalCells = gridSize * gridSize
    const coveredCells = grid.flat().filter(cell => cell).length
    return (coveredCells / totalCells) * 100
  }

  const getSmartScale = (element: Element, primary: boolean): number => {
    // Smart scaling based on element type
    const backgroundCategories = ['nature', 'architecture', 'space', 'vintage']
    const foregroundCategories = ['people', 'animals', 'explosions']
    
    if (backgroundCategories.includes(element.category)) {
      // Background elements should be larger
      return primary ? 0.6 + Math.random() * 0.4 : 0.4 + Math.random() * 0.5
    } else if (foregroundCategories.includes(element.category)) {
      // Foreground elements should be smaller to medium
      return primary ? 0.3 + Math.random() * 0.4 : 0.2 + Math.random() * 0.3
    } else {
      // Mid-ground elements - balanced sizing
      return primary ? 0.4 + Math.random() * 0.4 : 0.25 + Math.random() * 0.4
    }
  }
    // Smart scaling based on element type
    const backgroundCategories = ['nature', 'architecture', 'space', 'vintage']
    const foregroundCategories = ['people', 'animals', 'explosions']
    
    if (backgroundCategories.includes(element.category)) {
      // Background elements should be larger
      return primary ? 0.6 + Math.random() * 0.4 : 0.4 + Math.random() * 0.5
    } else if (foregroundCategories.includes(element.category)) {
      // Foreground elements should be smaller to medium
      return primary ? 0.3 + Math.random() * 0.4 : 0.2 + Math.random() * 0.3
    } else {
      // Mid-ground elements - balanced sizing
      return primary ? 0.4 + Math.random() * 0.4 : 0.25 + Math.random() * 0.4
    }
  }
    if (!promptText.trim()) return categoryElements
    
    const words = promptText.toLowerCase().split(/[\s,]+/).filter(Boolean)
    const scoredElements = categoryElements.map(element => {
      let score = 0
      const elementWords = [
        ...element.name.toLowerCase().split(/[\s-_]+/),
        ...element.tags.map(tag => tag.toLowerCase())
      ]
      
      // Score based on keyword matches in file names
      words.forEach(word => {
        elementWords.forEach(elementWord => {
          if (elementWord === word) score += 10 // Exact match
          else if (elementWord.includes(word) && word.length > 2) score += 5 // Substring match
          else if (word.includes(elementWord) && elementWord.length > 2) score += 3 // Reverse substring
        })
      })
      
      return { element, score }
    })
    
    // Return elements sorted by relevance score, fallback to random if no matches
    const relevantElements = scoredElements.filter(item => item.score > 0)
    return relevantElements.length > 0 
      ? relevantElements.sort((a, b) => b.score - a.score).map(item => item.element)
      : categoryElements
  }

  const generateCollage = async () => {
    if (availableElements.length === 0) {
      alert('No elements available. Please upload some elements first.')
      return
    }
    
    setIsGenerating(true)
    
    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    try {
      const promptAnalysis = parsePrompt(prompt)
      let primaryCategories: string[]
      
      if (promptAnalysis.categories.length > 0) {
        // User entered a prompt - use detected categories
        primaryCategories = promptAnalysis.categories
      } else if (prompt.trim() === '') {
        // No prompt - completely random categories
        const shuffledCategories = [...categories].sort(() => Math.random() - 0.5)
        primaryCategories = shuffledCategories.slice(0, Math.floor(Math.random() * 4) + 2) // 2-5 random categories
        console.log('No prompt detected - using random categories:', primaryCategories)
      } else {
        // Prompt entered but no categories detected - fall back to first few
        primaryCategories = categories.slice(0, 3)
      }
      
      const elements: CollageElement[] = []
      
      console.log('Prompt analysis:', promptAnalysis)
      
      if (promptAnalysis.isExclusive && promptAnalysis.exclusiveCategory) {
        // EXCLUSIVE MODE: Check if user wants specific elements vs entire category
        const exclusiveKeyword = exclusiveKeywords.find(keyword => words.includes(keyword))
        const keywordIndex = words.indexOf(exclusiveKeyword!)
        const targetTerm = words[keywordIndex + 1]
        
        // Find elements that specifically match the target term
        const specificElements = availableElements.filter(element => {
          const elementWords = [
            ...element.name.toLowerCase().split(/[\s-_]+/),
            ...element.tags.map(tag => tag.toLowerCase())
          ]
          return elementWords.some(word => 
            word === targetTerm || 
            (word.length > 3 && word.includes(targetTerm)) ||
            (targetTerm && targetTerm.length > 3 && targetTerm.includes(word))
          )
        })
        
        let exclusiveElements: Element[]
        let exclusiveLabel: string
        
        if (specificElements.length > 0 && targetTerm && !categories.includes(targetTerm)) {
          // User wants specific elements (e.g., "ALL tigers")
          exclusiveElements = specificElements
          exclusiveLabel = targetTerm.toUpperCase()
          console.log(`Specific exclusive mode: Found ${exclusiveElements.length} ${targetTerm} elements`)
        } else {
          // User wants entire category (e.g., "ONLY animals")
          exclusiveElements = availableElements.filter(el => el.category === promptAnalysis.exclusiveCategory)
          exclusiveLabel = promptAnalysis.exclusiveCategory!.toUpperCase()
          console.log(`Category exclusive mode: Found ${exclusiveElements.length} elements from ${promptAnalysis.exclusiveCategory}`)
        }
        
        if (exclusiveElements.length === 0) {
          alert(`No elements found for: ${exclusiveLabel}`)
          return
        }
        
        if (exclusiveElements.length < 5) {
          console.warn(`Only ${exclusiveElements.length} elements found for "${exclusiveLabel}" - this may result in a sparse collage`)
        }
        
        // Adapt element counts based on available elements
        const maxElements = exclusiveElements.length
        const primaryCount = Math.min(Math.floor(Math.random() * 3) + 2, Math.floor(maxElements * 0.4)) // 2-4 primary, max 40% of available
        const secondaryCount = Math.min(Math.floor(Math.random() * 8) + 6, maxElements - primaryCount) // 6-14 secondary, use remaining
        
        console.log(`Using ${primaryCount} primary + ${secondaryCount} secondary from ${maxElements} available ${exclusiveLabel} elements`)
        
        // Add primary elements
        for (let i = 0; i < primaryCount; i++) {
          const element = exclusiveElements[Math.floor(Math.random() * exclusiveElements.length)]
          
          // Smart scaling and layering
          const smartScale = getSmartScale(element, true)
          
          elements.push({
            ...element,
            x: Math.random() * 65,
            y: Math.random() * 75,
            scale: smartScale,
            rotation: (Math.random() - 0.5) * 50,
            opacity: 0.85 + Math.random() * 0.15,
            zIndex: getElementLayer(element, smartScale, true),
            primary: true
          })
        }
        
        // Add secondary elements
        for (let i = 0; i < secondaryCount; i++) {
          const element = exclusiveElements[Math.floor(Math.random() * exclusiveElements.length)]
          
          // Avoid exact duplicates
          const isDuplicate = elements.some(el => 
            el.id === element.id && 
            Math.abs(el.x - (Math.random() * 80)) < 15 &&
            Math.abs(el.y - (Math.random() * 85)) < 15
          )
          
          if (isDuplicate) continue
          
          // Smart scaling and layering for secondary elements
          const smartScale = getSmartScale(element, false)
          
          elements.push({
            ...element,
            x: Math.random() * 80,
            y: Math.random() * 85,
            scale: smartScale,
            rotation: (Math.random() - 0.5) * 80,
            opacity: 0.4 + Math.random() * 0.5,
            zIndex: getElementLayer(element, smartScale, false),
            primary: false
          })
        }
        
      } else {
        // NORMAL MODE: Mixed categories as before
        console.log(`Normal mode: Using categories: ${primaryCategories.join(', ')}`)
        
        // Add 3-6 primary elements from detected categories
        const primaryCount = Math.floor(Math.random() * 4) + 3
        for (let i = 0; i < primaryCount && primaryCategories.length > 0; i++) {
          const category = primaryCategories[Math.floor(Math.random() * primaryCategories.length)]
          const categoryElements = availableElements.filter(el => el.category === category)
          
          if (categoryElements.length === 0) continue
          
          // Use smart matching to get most relevant files for the prompt
          const relevantElements = getMatchingElements(prompt, categoryElements)
          const element = relevantElements[Math.floor(Math.random() * Math.min(relevantElements.length, 5))]
          
          // Smart scaling and layering
          const smartScale = getSmartScale(element, true)
          
          elements.push({
            ...element,
            x: Math.random() * 65,
            y: Math.random() * 75,
            scale: smartScale,
            rotation: (Math.random() - 0.5) * 50,
            opacity: 0.85 + Math.random() * 0.15,
            zIndex: getElementLayer(element, smartScale, true),
            primary: true
          })
        }
        
        // Add 6-12 secondary random elements
        const secondaryCount = Math.floor(Math.random() * 7) + 6
        for (let i = 0; i < secondaryCount; i++) {
          const element = availableElements[Math.floor(Math.random() * availableElements.length)]
          
          // Avoid duplicates in same position
          const isDuplicate = elements.some(el => 
            el.id === element.id && 
            Math.abs(el.x - (Math.random() * 80)) < 10 &&
            Math.abs(el.y - (Math.random() * 85)) < 10
          )
          
          if (isDuplicate) continue
          
          // Smart scaling and layering for secondary elements
          const smartScale = getSmartScale(element, false)
          
          elements.push({
            ...element,
            x: Math.random() * 80,
            y: Math.random() * 85,
            scale: smartScale,
            rotation: (Math.random() - 0.5) * 80,
            opacity: 0.4 + Math.random() * 0.5,
            zIndex: getElementLayer(element, smartScale, false),
            primary: false
          })
        }
      }
      
      // Sort by z-index for proper layering
      elements.sort((a, b) => a.zIndex - b.zIndex)
      
      // Fill canvas gaps to ensure complete coverage
      const filledElements = fillCanvasGaps(elements, 85) // 85% coverage target
      
      setCollageElements(filledElements)
      
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
      await dbHelpers.saveCollage({
        prompt: prompt || 'Untitled',
        elements_data: collageElements,
        title: prompt ? `Collage: ${prompt}` : 'Untitled Collage'
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
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight
      })
      
      const link = document.createElement('a')
      link.download = `collage-${prompt.replace(/\s+/g, '-') || 'untitled'}-${Date.now()}.png`
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
          <h2 className="text-xl lg:text-2xl font-light tracking-wider">RANDOMIZER</h2>
          <div className="w-16 h-1 bg-red-600 mt-4"></div>
        </div>
        
        <div className="flex-1">
          <label className="form-label">
            PROMPT
          </label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="statues and explosions"
            className="form-input bg-white text-black"
            disabled={isGenerating}
          />
          
          <button
            onClick={generateCollage}
            disabled={isGenerating || availableElements.length === 0}
            className="w-full mt-6 btn-primary p-4 text-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                GENERATING...
              </>
            ) : (
              <>
                <Shuffle size={20} />
                RANDOMIZE
              </>
            )}
          </button>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mt-6">
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
            <div className="mt-6 border-t border-gray-800 pt-6">
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
                  Zoom to compose final layout before export
                </p>
              </div>
            </div>
          )}
          
          {(detectedCategories.length > 0 || prompt.trim() === '') && (
            <div className="mt-6 animate-fade-in">
              <h3 className="font-bold mb-3 tracking-wide text-red-400">
                {(() => {
                  if (prompt.trim() === '') return 'RANDOM MODE'
                  const analysis = parsePrompt(prompt)
                  return analysis.isExclusive ? 'EXCLUSIVE MODE' : 'DETECTED CATEGORIES'
                })()}
              </h3>
              {prompt.trim() === '' ? (
                <div className="flex flex-wrap gap-2">
                  <span className="bg-blue-600 px-3 py-1 text-xs font-bold tracking-wide rounded-sm text-white">
                    ALL CATEGORIES
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detectedCategories.map(category => (
                    <span 
                      key={category} 
                      className={`px-3 py-1 text-xs font-bold tracking-wide rounded-sm ${
                        (() => {
                          const analysis = parsePrompt(prompt)
                          return analysis.isExclusive ? 'bg-yellow-600 text-black' : 'bg-red-600 text-white'
                        })()
                      }`}
                    >
                      {(() => {
                        const analysis = parsePrompt(prompt)
                        return analysis.isExclusive ? `ONLY ${category.toUpperCase()}` : category.toUpperCase()
                      })()}
                    </span>
                  ))}
                </div>
              )}
              {(() => {
                if (prompt.trim() === '') {
                  return (
                    <p className="text-xs text-blue-400 mt-2">
                      🎲 Random mode: Elements from all categories will be mixed
                    </p>
                  )
                }
                const analysis = parsePrompt(prompt)
                return analysis.isExclusive && (
                  <p className="text-xs text-yellow-400 mt-2">
                    🔒 Exclusive mode: All elements will be from this category only
                  </p>
                )
              })()}
            </div>
          )}

          <div className="mt-8 text-sm">
            <h3 className="font-bold mb-3 tracking-wide">HOW IT WORKS</h3>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>1. Enter keywords for elements you want featured</p>
              <p>2. Use "ONLY" or "ALL" for exclusive single-category collages</p>
              <p>3. Hit randomize to generate your collage</p>
              <p>4. Zoom to compose, then save or export as high-res PNG</p>
              <div className="mt-3 pt-3 border-t border-gray-800">
                <p className="text-xs text-yellow-400">
                  💡 Try: "ONLY animals", "ALL explosions", "JUST statues"
                </p>
              </div>
            </div>
          </div>
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
                    <p className="text-lg lg:text-xl mb-2">Enter a prompt and hit randomize</p>
                    <p className="text-sm lg:text-base">to generate your collage</p>
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
}
