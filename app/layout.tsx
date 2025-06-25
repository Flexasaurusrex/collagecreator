import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Collage Randomizer',
  description: 'A bauhaus-inspired collage generation tool that creates dynamic compositions from curated visual elements.',
  keywords: ['collage', 'art', 'bauhaus', 'randomizer', 'generative', 'design'],
  authors: [{ name: 'Collage Randomizer Team' }],
  creator: 'Collage Randomizer',
  publisher: 'Collage Randomizer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://collage-randomizer.vercel.app'),
  openGraph: {
    title: 'Collage Randomizer',
    description: 'Create stunning bauhaus-inspired collages with AI-powered randomization',
    url: 'https://collage-randomizer.vercel.app',
    siteName: 'Collage Randomizer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Collage Randomizer Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Collage Randomizer',
    description: 'Create stunning bauhaus-inspired collages with AI-powered randomization',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-white">
          <nav className="no-print fixed top-0 left-0 right-0 z-50 bg-black text-white border-b-2 border-red-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-8">
                  <a href="/" className="text-xl font-bold tracking-wider hover:text-red-400 transition-colors">
                    COLLAGE RANDOMIZER
                  </a>
                  <div className="hidden md:flex space-x-6">
                    <a href="/" className="hover:text-red-400 transition-colors font-medium">
                      GENERATOR
                    </a>
                    <a href="/gallery" className="hover:text-red-400 transition-colors font-medium">
                      GALLERY
                    </a>
                    <a href="/admin" className="hover:text-red-400 transition-colors font-medium">
                      ADMIN
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                </div>
              </div>
            </div>
          </nav>
          
          <main className="pt-16">
            {children}
          </main>
          
          <footer className="no-print bg-black text-white py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-bold mb-4 tracking-wider">COLLAGE RANDOMIZER</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Bauhaus-inspired generative art tool for creating dynamic collages 
                    from curated visual elements.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-4 tracking-wider">FEATURES</h4>
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li>• Smart prompt processing</li>
                    <li>• Dynamic generation</li>
                    <li>• High-res exports</li>
                    <li>• Element management</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-4 tracking-wider">TECH STACK</h4>
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li>• Next.js & React</li>
                    <li>• Supabase Database</li>
                    <li>• Vercel Deployment</li>
                    <li>• Tailwind CSS</li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
                <p>&copy; 2024 Collage Randomizer. Built with ❤️ and geometric precision.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
