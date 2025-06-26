<div
          key={element.id}
          className={`absolute cursor-move select-none transition-all duration-150 ${
            selectedElements.has(element.id) 
              ? 'ring-3 ring-yellow-400 ring-opacity-90 shadow-xl' 
              : 'hover:ring-2 hover:ring-blue-400 hover:ring-opacity-70'
          }`}
          style={{
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            transform: element.rotation ? `rotate(${element.rotation}deg)` : 'none',
            // Improved z-index system for precise clicking
            zIndex: selectedElements.has(element.id) 
              ? 9999 // Selected elements always on top
              : (element.zIndex || 1) + collageElements.length - collageElements.findIndex(el => el.id === element.id),
            // Ensure clickable area
            pointerEvents: 'auto',
          }}
          // Enhanced click detection - stops all propagation immediately
          onClick={(e) => {
            e.stopImmediatePropagation()
            e.preventDefault()
            console.log(`🎯 Clicked element: ${element.id}`)
            toggleElementSelection(element.id)
          }}
          onMouseDown={(e) => {
            e.stopImmediatePropagation()
            e.preventDefault()
            
            // Ensure this element gets highest z-index during drag
            const elementDiv = e.currentTarget as HTMLElement
            elementDiv.style.zIndex = '10000'
            
            console.log(`🖱️ Starting drag for element: ${element.id}`)
            startDrag(e, element.id)
          }}
          onMouseUp={(e) => {
            // Reset z-index after drag
            const elementDiv = e.currentTarget as HTMLElement
            elementDiv.style.zIndex = selectedElements.has(element.id) ? '9999' : `${(element.zIndex || 1) + collageElements.length - collageElements.findIndex(el => el.id === element.id)}`
          }}
          // Visual feedback on hover
          onMouseEnter={(e) => {
            const elementDiv = e.currentTarget as HTMLElement
            elementDiv.style.filter = 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
          }}
          onMouseLeave={(e) => {
            const elementDiv = e.currentTarget as HTMLElement
            elementDiv.style.filter = 'none'
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopImmediatePropagation()
            removeElementFromCanvas(element.id)
          }}
        >
