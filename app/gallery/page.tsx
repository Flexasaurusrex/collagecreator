'use client'

import { useState, useEffect } from 'react'
import { dbHelpers } from '@/lib/supabase'
import { SavedCollage } from '@/lib/types'
import { Calendar, Download, Trash2, Eye, Search, Filter } from 'lucide-react'

export default function Gallery() {
  const [collages, setCollages] = useState<SavedCollage[]>([])
  const [filteredCollages, setFilteredCollages] = useState<SavedCollage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'prompt'>('newest')

  useEffect(() => {
    loadCollages()
  }, [])

  useEffect(() => {
    filterAndSortCollages()
  }, [collages, searchTerm, sortBy])

  const loadCollages = async () => {
    try {
      setLoading(true)
      const data = await dbHelpers.getUserCollages()
      setCollages(data)
    } catch (error) {
      console.error('Error loading collages:', error)
      alert('Error loading gallery. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortCollages = () => {
    let filtered = [...collages]

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(collage =>
        collage.prompt.toLowerCase().includes(search) ||
        collage.title?.toLowerCase().includes(search)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'prompt':
          return a.prompt.localeCompare(b.prompt)
        default:
          return 0
      }
    })

    setFilteredCollages(filtered)
  }

  const deleteCollage = async (id: string) => {
    if (!confirm('Delete this collage? This cannot be undone.')) return

    try {
      await dbHelpers.deleteCollage(id)
      await loadCollages()
      alert('Collage deleted successfully')
    } catch (error) {
      console.error('Error deleting collage:', error)
      alert('Error deleting collage. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const recreateCollage = (collage: SavedCollage) => {
    // Store collage data in localStorage and redirect to main page
    localStorage.setItem('recreateCollage', JSON.stringify({
      prompt: collage.prompt,
      elements: collage.elements_data
    }))
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gallery...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="bg-black text-white p-6 rounded-lg mb-6">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">GALLERY</h1>
          <p className="text-gray-300">Saved collages and creations</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search collages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-red-600"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="prompt">By Prompt</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">
                {filteredCollages.length} of {collages.length} collages
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredCollages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Eye size={48} className="mx-auto mb-4" />
              {collages.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium mb-2">No saved collages yet</h3>
                  <p>Create your first collage to see it here!</p>
                  <a href="/" className="inline-block mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Create Collage
                  </a>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">No collages match your search</h3>
                  <p>Try adjusting your search terms</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCollages.map((collage) => (
              <div key={collage.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow group">
                {/* Preview */}
                <div className="aspect-[3/4] bg-gray-100 rounded-t-lg relative overflow-hidden">
                  <div className="w-full h-full relative">
                    {collage.elements_data.map((element, index) => (
                      <div
                        key={`${element.id}-${index}`}
                        className="absolute"
                        style={{
                          left: `${element.x}%`,
                          top: `${element.y}%`,
                          transform: `rotate(${element.rotation}deg) scale(${element.scale})`,
                          opacity: element.opacity,
                          zIndex: element.zIndex,
                        }}
                      >
                        <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center text-xs font-bold">
                          {element.primary ? 'P' : 'S'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        onClick={() => recreateCollage(collage)}
                        className="bg-white text-black p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Recreate this collage"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => deleteCollage(collage.id)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Delete collage"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 truncate" title={collage.title || collage.prompt}>
                    {collage.title || collage.prompt}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    Prompt: "{collage.prompt}"
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(collage.created_at)}
                    </div>
                    <div>
                      {collage.elements_data.length} elements
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
