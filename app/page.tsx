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
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadElements()
  }, [])

  useEffect(() => {
    if (prompt) {
      const detected = parsePrompt(prompt)
      setDetectedCategories(detected)
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

  const getMatchingElements = (promptText: string, categoryElements: Element[]): Element[] => {
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
      const primaryCategories = detectedCategories.length > 0 ? detectedCategories : categories.slice(0, 3)
      const elements: CollageElement[] = []
      
      // Add 3-6 primary elements from detected categories with smart selection
      const primaryCount = Math.floor(Math.random() * 4) + 3
      for (let i = 0; i < primaryCount && primaryCategories.length > 0; i++) {
        const category = primaryCategories[Math.floor(Math.random() * primaryCategories.length)]
        const categoryElements = availableElements.filter(el => el.category === category)
        
        if (categoryElements.length === 0) continue
        
        // Use smart matching to get most relevant files for the prompt
        const relevantElements = getMatchingElements(prompt, categoryElements)
        const element = relevantElements[Math.floor(Math.random() * Math.min(relevantElements.length, 5))] // Pick from top 5 most relevant
        
        elements.push({
          ...element,
          x: Math.random() * 65, // Keep elements more centered
          y: Math.random() * 75,
          scale: 0.4 + Math.random() * 0.5, // Slightly larger primary elements
          rotation: (Math.random() - 0.5) * 50, // Less extreme rotation
          opacity: 0.85 + Math.random() * 0.15,
          zIndex: Math.floor(Math.random() * 15) + 15, // Higher z-index for primary
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
        
        elements.push({
          ...element,
          x: Math.random() * 80,
          y: Math.random() * 85,
          scale: 0.15 + Math.random() * 0.4, // Smaller secondary elements
          rotation: (Math.random() - 0.5) * 80,
          opacity: 0.4 + Math.random() * 0.5,
          zIndex: Math.floor(Math.random() * 12),
          primary: false
        })
      }
      
      // Sort by z-index for proper layering
      elements.sort((a, b) => a.zIndex - b.zIndex)
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
          
          {detectedCategories.length > 0 && (
            <div className="mt-6 animate-fade-in">
              <h3 className="font-bold mb-3 tracking-wide text-red-400">DETECTED CATEGORIES</h3>
              <div className="flex flex-wrap gap-2">
                {detectedCategories.map(category => (
                  <span 
                    key={category} 
                    className="bg-red-600 px-3 py-1 text-xs font-bold tracking-wide rounded-sm"
                  >
                    {category.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-sm">
            <h3 className="font-bold mb-3 tracking-wide">HOW IT WORKS</h3>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>1. Enter keywords for elements you want featured</p>
              <p>2. Hit randomize to generate your collage</p>
              <p>3. Save to gallery or export as high-res PNG</p>
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
          PORTRAIT • 3:4
        </div>
        
        <div className="w-full h-full flex items-center justify-center p-4">
          <div 
            ref={canvasRef}
            className="collage-canvas bg-white shadow-2xl relative"
            style={{ 
              aspectRatio: '3/4', 
              width: '100%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 120px)'
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
  )
}
