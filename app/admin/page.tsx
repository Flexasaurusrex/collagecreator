'use client'

import { useState, useCallback, useEffect } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { Element, UploadProgress } from '@/lib/types'
import { Upload, X, Tag, Image, Trash2, Eye, BarChart3, Loader2 } from 'lucide-react'

export default function AdminUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [existingElements, setExistingElements] = useState<Element[]>([])
  const [stats, setStats] = useState<{ category: string; count: number }[]>([])
  const [view, setView] = useState<'upload' | 'manage' | 'stats'>('upload')

  useEffect(() => {
    loadExistingElements()
    loadStats()
  }, [])

  const loadExistingElements = async () => {
    try {
      const elements = await dbHelpers.getAllElements()
      setExistingElements(elements)
    } catch (error) {
      console.error('Error loading elements:', error)
    }
  }

  const loadStats = async () => {
    try {
      const categoryStats = await dbHelpers.getCategoryStats()
      setStats(categoryStats.sort((a, b) => b.count - a.count))
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer.items)
    
    // Handle folder drops
    if (items.length > 0 && items[0].webkitGetAsEntry) {
      handleFolderDrop(items)
    } else {
      // Handle direct file drops
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
      )
      setFiles(prev => [...prev, ...droppedFiles])
    }
  }, [])

  const handleFolderDrop = async (items: DataTransferItem[]) => {
    const filesByCategory: { [category: string]: File[] } = {}
    
    for (const item of items) {
      const entry = item.webkitGetAsEntry()
      if (entry) {
        if (entry.isDirectory) {
          // Extract category from folder name
          const categoryName = entry.name.toLowerCase()
          const folderFiles = await readDirectory(entry as FileSystemDirectoryEntry)
          if (folderFiles.length > 0) {
            filesByCategory[categoryName] = folderFiles
          }
        } else if (entry.isFile) {
          // Try to extract category from file name
          const file = item.getAsFile()!
          const detectedCategory = detectCategoryFromFileName(file.name)
          if (!filesByCategory[detectedCategory]) {
            filesByCategory[detectedCategory] = []
          }
          filesByCategory[detectedCategory].push(file)
        }
      }
    }
    
    // Set files and auto-detect primary category
    const allFiles = Object.values(filesByCategory).flat()
    setFiles(prev => [...prev, ...allFiles])
    
    // Auto-set category if all files are from same category
    const categories = Object.keys(filesByCategory)
    if (categories.length === 1) {
      setCategory(categories[0])
    }
    
    console.log('Auto-detected categories:', filesByCategory)
  }

  const readDirectory = (directoryEntry: FileSystemDirectoryEntry): Promise<File[]> => {
    return new Promise((resolve) => {
      const files: File[] = []
      const reader = directoryEntry.createReader()
      
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(files)
            return
          }
          
          for (const entry of entries) {
            if (entry.isFile) {
              const file = await new Promise<File>((resolve) => {
                (entry as FileSystemFileEntry).file(resolve)
              })
              if (file.type.startsWith('image/')) {
                files.push(file)
              }
            }
          }
          
          readEntries() // Continue reading
        })
      }
      
      readEntries()
    })
  }

  const detectCategoryFromFileName = (fileName: string): string => {
    const name = fileName.toLowerCase()
    
    // Common category patterns
    const categoryPatterns = {
      'statues': ['statue', 'sculpture', 'bust', 'monument'],
      'explosions': ['explosion', 'blast', 'fire', 'bomb', 'nuclear'],
      'animals': ['animal', 'cat', 'dog', 'tiger', 'lion', 'bird', 'eagle', 'wolf'],
      'nature': ['tree', 'flower', 'plant', 'mountain', 'ocean', 'forest', 'leaf'],
      'architecture': ['building', 'house', 'tower', 'bridge', 'church', 'castle'],
      'people': ['person', 'human', 'face', 'portrait', 'man', 'woman'],
      'objects': ['object', 'tool', 'machine', 'vehicle', 'furniture'],
      'abstract': ['abstract', 'pattern', 'texture', 'geometric'],
      'vintage': ['vintage', 'old', 'antique', 'retro', 'historical'],
      'space': ['space', 'planet', 'star', 'galaxy', 'cosmic', 'universe']
    }
    
    // Check for category patterns in filename
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(pattern => name.includes(pattern))) {
        return category
      }
    }
    
    // Try to extract from file path/prefix
    const parts = name.split(/[-_\s]/)
    if (parts.length > 1) {
      const potentialCategory = parts[0]
      if (potentialCategory.length > 2) {
        return potentialCategory
      }
    }
    
    return 'misc' // Default category
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file =>
        file.type.startsWith('image/')
      )
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      alert('Please select files to upload')
      return
    }
    
    setUploading(true)
    const progressList: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending'
    }))
    setUploadProgress(progressList)
    
    // Group files by auto-detected category
    const filesByCategory: { [category: string]: { file: File; index: number }[] } = {}
    
    files.forEach((file, index) => {
      const detectedCategory = category.trim() || detectCategoryFromFileName(file.name)
      if (!filesByCategory[detectedCategory]) {
        filesByCategory[detectedCategory] = []
      }
      filesByCategory[detectedCategory].push({ file, index })
    })
    
    console.log('Uploading files by category:', Object.keys(filesByCategory))
    
    try {
      // Process each category
      for (const [categoryName, categoryFiles] of Object.entries(filesByCategory)) {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
        
        // Process files in parallel batches of 5
        const batchSize = 5
        for (let i = 0; i < categoryFiles.length; i += batchSize) {
          const batch = categoryFiles.slice(i, i + batchSize)
          
          // Upload batch in parallel
          await Promise.allSettled(
            batch.map(async ({ file, index: globalIndex }) => {
              try {
                // Update progress
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, status: 'uploading', progress: 25 } : item
                ))
                
                const fileName = `${Date.now()}-${globalIndex}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
                
                // Upload to Supabase Storage
                const fileUrl = await dbHelpers.uploadFile('collage-elements', fileName, file)
                
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, progress: 75 } : item
                ))
                
                // Save metadata to database with auto-detected category
                await dbHelpers.addElement({
                  name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
                  category: categoryName,
                  file_path: fileName,
                  file_url: fileUrl,
                  tags: tagArray
                })
                
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, status: 'complete', progress: 100 } : item
                ))
                
              } catch (error) {
                console.error(`Error uploading ${file.name}:`, error)
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, status: 'error', progress: 0, error: 'Upload failed' } : item
                ))
              }
            })
          )
          
          // Small delay between batches to avoid overwhelming the server
          if (i + batchSize < categoryFiles.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
    try {
      let totalSuccessful = 0
      
      // Process each category
      for (const [categoryName, categoryFiles] of Object.entries(filesByCategory)) {
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
        
        // Process files in parallel batches of 5
        const batchSize = 5
        for (let i = 0; i < categoryFiles.length; i += batchSize) {
          const batch = categoryFiles.slice(i, i + batchSize)
          
          // Upload batch in parallel
          const results = await Promise.allSettled(
            batch.map(async ({ file, index: globalIndex }) => {
              try {
                // Update progress
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, status: 'uploading', progress: 25 } : item
                ))
                
                const fileName = `${Date.now()}-${globalIndex}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
                
                // Upload to Supabase Storage
                const fileUrl = await dbHelpers.uploadFile('collage-elements', fileName, file)
                
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, progress: 75 } : item
                ))
                
                // Save metadata to database with auto-detected category
                await dbHelpers.addElement({
                  name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
                  category: categoryName,
                  file_path: fileName,
                  file_url: fileUrl,
                  tags: tagArray
                })
                
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, status: 'complete', progress: 100 } : item
                ))
                
                return { success: true, file: file.name }
                
              } catch (error) {
                console.error(`Error uploading ${file.name}:`, error)
                setUploadProgress(prev => prev.map((item, idx) => 
                  idx === globalIndex ? { ...item, status: 'error', progress: 0, error: 'Upload failed' } : item
                ))
                return { success: false, file: file.name, error }
              }
            })
          )
          
          // Count successful uploads in this batch
          totalSuccessful += results.filter(result => result.status === 'fulfilled' && result.value.success).length
          
          // Small delay between batches to avoid overwhelming the server
          if (i + batchSize < categoryFiles.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      // Refresh data
      await loadExistingElements()
      await loadStats()
      
      // Reset form
      setFiles([])
      setCategory('')
      setTags('')
      
      alert(`Upload complete! Successfully uploaded ${totalSuccessful} of ${files.length} files.`)
      
    } catch (error) {
      console.error('Error in upload process:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress([]), 3000) // Clear progress after 3 seconds
    }
  }

  const deleteElement = async (element: Element) => {
    if (!confirm(`Delete "${element.name}"? This cannot be undone.`)) return
    
    try {
      await dbHelpers.deleteElement(element.id)
      await dbHelpers.deleteFile('collage-elements', element.file_path)
      await loadExistingElements()
      await loadStats()
      alert('Element deleted successfully')
    } catch (error) {
      console.error('Error deleting element:', error)
      alert('Error deleting element')
    }
  }

  const getUniqueCategories = () => {
    return Array.from(new Set(existingElements.map(el => el.category))).sort()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="bg-black text-white p-6 rounded-lg mb-6">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">ADMIN PANEL</h1>
          <p className="text-gray-300">Upload and manage collage elements</p>
          
          {/* Navigation */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setView('upload')}
              className={`px-4 py-2 font-bold tracking-wide transition-colors ${
                view === 'upload' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              UPLOAD
            </button>
            <button
              onClick={() => setView('manage')}
              className={`px-4 py-2 font-bold tracking-wide transition-colors ${
                view === 'manage' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              MANAGE
            </button>
            <button
              onClick={() => setView('stats')}
              className={`px-4 py-2 font-bold tracking-wide transition-colors ${
                view === 'stats' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              STATS
            </button>
          </div>
        </div>

        {/* Upload View */}
        {view === 'upload' && (
          <div className="space-y-6">
            {/* File Drop Zone */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Upload Elements</h2>
              
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
                className="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-red-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-lg font-medium mb-2">Drop entire folders or images here</p>
                <p className="text-gray-500">Supports: Folders, JPG, PNG, GIF, WebP</p>
                <p className="text-xs text-gray-400 mt-2">
                  📁 Folder names become categories automatically<br/>
                  🏷️ File names are analyzed for smart categorization
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onFileSelect}
                  className="hidden"
                />
              </div>
            </div>
            
            {/* Selected Files */}
            {files.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold mb-4">Selected Files ({files.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                  {files.map((file, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="file-preview w-full h-24 object-cover rounded border"
                      />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      <p className="text-xs mt-1 truncate" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Upload Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Category (Optional - Auto-detected)</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Leave blank for auto-detection"
                      className="form-input"
                      list="existing-categories"
                    />
                    <datalist id="existing-categories">
                      {getUniqueCategories().map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    <p className="text-xs text-gray-500 mt-1">
                      Categories auto-detected from folder names or file patterns
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Tags (comma separated)</label>
                    <input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., vintage, black-white, ornate"
                      className="form-input"
                    />
                  </div>
                </div>
                
                <button
                  onClick={uploadFiles}
                  disabled={uploading || files.length === 0}
                  className="w-full btn-primary p-3 text-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Auto-Upload {files.length} Files
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold mb-4">Upload Progress</h3>
                <div className="space-y-2">
                  {uploadProgress.map((progress, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate">{progress.fileName}</span>
                          <span className={`font-bold ${
                            progress.status === 'complete' ? 'text-green-600' :
                            progress.status === 'error' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {progress.status === 'complete' ? '✓' :
                             progress.status === 'error' ? '✗' :
                             `${progress.progress}%`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              progress.status === 'complete' ? 'bg-green-500' :
                              progress.status === 'error' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                        {progress.error && (
                          <p className="text-red-500 text-xs mt-1">{progress.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage View */}
        {view === 'manage' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Manage Elements ({existingElements.length})</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {existingElements.map((element) => (
                  <div key={element.id} className="border rounded-lg p-3 group hover:shadow-lg transition-shadow">
                    <img
                      src={element.file_url}
                      alt={element.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                    <p className="text-sm font-medium truncate" title={element.name}>
                      {element.name}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">{element.category}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => window.open(element.file_url, '_blank')}
                        className="flex-1 bg-blue-100 text-blue-600 p-1 rounded text-xs hover:bg-blue-200"
                      >
                        <Eye size={12} className="mx-auto" />
                      </button>
                      <button
                        onClick={() => deleteElement(element)}
                        className="flex-1 bg-red-100 text-red-600 p-1 rounded text-xs hover:bg-red-200"
                      >
                        <Trash2 size={12} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats View */}
        {view === 'stats' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 size={24} />
              Statistics
            </h2>
            <div className="space-y-4">
              {stats.map((stat) => (
                <div key={stat.category} className="flex items-center gap-4">
                  <div className="w-32 font-medium">{stat.category}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-red-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(stat.count / Math.max(...stats.map(s => s.count))) * 100}%` }}
                    >
                      <span className="text-white text-sm font-bold">{stat.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
