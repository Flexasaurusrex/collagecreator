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
                  {/* FIXED: Add DOM reordering to desktop version (was missing!) */}
                  {collageElements
                    .slice() // Create copy to avoid mutating original array
                    .sort((a, b) => a.zIndex - b.zIndex) // Sort by z-index - higher z-index = later in DOM = on top
                    .map((element) => {
                    const elementId = `${element.id}-${element.x}-${element.y}`
                    const isSelected = selectedElementId === elementId
                    
                    return (
                      <div
                        key={elementId}
                        className={`collage-element absolute select-none transition-all duration-200 ease-out ${
                          isSelected ? 'ring-2 ring-yellow-400 shadow-2xl' : 'hover:ring-1 hover:ring-blue-400'
                        } ${draggedCanvasElement === element ? 'opacity-90 scale-110' : ''}`}
                        style={{
                          left: `${element.x}%`,
                          top: `${element.y}%`,
                          transform: `translate3d(0, 0, 0) rotate(${element.rotation}deg) scale(${element.scale})`,
                          opacity: draggedCanvasElement === element ? 0.9 : element.opacity,
                          // REMOVED: z-index property - relying on DOM order instead
                          transformOrigin: 'center',
                          cursor: draggedCanvasElement === element ? 'grabbing' : (isSelected ? 'grab' : 'pointer'),
                          pointerEvents: 'auto',
                          willChange: draggedCanvasElement === element ? 'transform' : 'auto',
                          backfaceVisibility: 'hidden',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          handleElementMouseDown(e, element)
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          handleElementClick(e, element)
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!isMobile) {
                            deleteElement(element)
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected && !draggedCanvasElement) {
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
                          src={element.file_url}
                          alt={element.name}
                          className="object-contain drop-shadow-lg pointer-events-none"
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
                            height: 'auto'
                          }}
                        />
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg pointer-events-none animate-pulse">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                        {/* Z-index debug indicator */}
                        <div className="absolute top-0 left-0 bg-red-600 text-white text-xs px-1 py-0.5 pointer-events-none font-bold">
                          z:{Math.round(element.zIndex)}
                        </div>
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
                        <p className="text-base lg:text-lg text-gray-500 mb-4">Generate inspiration to get started</p>
                        <p className="text-sm text-blue-400">⚡ Ultra-fast loading with smart optimization</p>
                      </div>
                    </div>
                  )}
                </div>
