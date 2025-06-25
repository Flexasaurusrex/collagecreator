# Collage Randomizer

A bauhaus-inspired collage generation tool that creates dynamic compositions from a curated database of visual elements.

## Features

🎨 **Smart Prompt Processing** - Enter keywords to influence primary elements
🎲 **Dynamic Generation** - Randomized positioning, scaling, and layering
💾 **Save & Export** - Save creations and export as high-res images
🔧 **Admin Interface** - Bulk upload and manage visual elements
📱 **Responsive Design** - Clean, bauhaus-inspired interface

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Database, Storage, Auth)
- **Deployment**: Vercel
- **Export**: HTML2Canvas, jsPDF

## Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/collage-randomizer.git
   cd collage-randomizer
   npm install
   ```

2. **Setup Supabase**
   - Create project at [supabase.com](https://supabase.com)
   - Run the SQL schema (see `/docs/database-schema.sql`)
   - Add your keys to `.env.local`

3. **Run Development**
   ```bash
   npm run dev
   ```

4. **Deploy to Vercel**
   - Push to GitHub
   - Connect repo to Vercel
   - Add environment variables
   - Deploy!

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ADMIN_PASSWORD=your_admin_password
```

## Project Structure

```
collage-randomizer/
├── app/                    # Next.js 13+ app directory
│   ├── admin/             # Admin upload interface
│   ├── api/               # API routes
│   └── page.tsx           # Main collage generator
├── components/            # React components
├── lib/                   # Utilities and configs
└── docs/                  # Documentation
```

## Usage

1. **Generate Collages**: Enter keywords and hit "Randomize"
2. **Upload Elements**: Use `/admin` to bulk upload images
3. **Save & Export**: Save creations or export as PNG/PDF

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT - See LICENSE file for details
