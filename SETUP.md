# ⚙️ Setup Guide - Collage Randomizer

## Quick Setup Checklist

### 1. Setup Supabase (Required)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (2-3 minutes)
3. Go to **SQL Editor** and run the entire `docs/database-schema.sql` file
4. Go to **Settings > API** and copy:
   - Project URL
   - Anon (public) key
   - Service role key

### 2. Configure Vercel Environment Variables
1. GitHub integration will auto-deploy when you push
2. In Vercel dashboard, go to your project settings
3. Add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
   - `ADMIN_PASSWORD` = Any secure password for admin access

### 3. First Deploy Test
1. Push your code to GitHub (Vercel will auto-deploy)
2. Visit your Vercel URL
2. Go to `/admin` and start uploading your 1800 elements
3. Test collage generation on the main page

---

## 📁 File Upload Strategy

### Batch Upload Process
1. **Organize your files** by category in folders
2. **Use the admin interface** at `/admin`
3. **Upload in batches** of 50-100 files per category
4. **Use consistent naming**: `category-description-number.jpg`

### Recommended Categories
- `statues` - Classical sculptures, busts, monuments
- `explosions` - Fire, blasts, smoke, energy
- `nature` - Plants, landscapes, organic forms
- `architecture` - Buildings, structures, geometric forms
- `people` - Portraits, figures, silhouettes
- `animals` - Wildlife, pets, creatures
- `objects` - Tools, artifacts, everyday items
- `abstract` - Patterns, shapes, textures
- `vintage` - Old photos, manuscripts, historical items
- `space` - Stars, planets, cosmic elements

### File Naming Best Practices
```
statues/greek-venus-marble-01.jpg
explosions/nuclear-mushroom-cloud-02.png
nature/oak-tree-silhouette-03.jpg
```

---

## 🔧 Configuration

### Supabase Storage Settings
- **File size limit**: 50MB per file (adjust in dashboard if needed)
- **Allowed types**: JPG, PNG, GIF, WebP
- **Public access**: Enabled for `collage-elements` bucket

### Performance Optimization
- Images are automatically optimized by Next.js
- Supabase CDN provides fast global delivery
- Canvas rendering uses HTML2Canvas for high-quality exports

---

## 🎨 Customization Options

### Design Tweaks
- **Colors**: Edit `app/globals.css` Bauhaus color variables
- **Typography**: Change fonts in `tailwind.config.js`
- **Layout**: Modify proportions in `app/page.tsx`

### Algorithm Improvements
- **Composition rules**: Add to `generateCollage()` function
- **Element weighting**: Modify selection probability
- **Positioning logic**: Enhance spatial distribution

### Feature Additions
- **User authentication**: Uncomment Supabase auth code
- **Social sharing**: Add share buttons to gallery
- **Print optimization**: Enhance export resolutions
- **Mobile app**: Use React Native with same backend

---

## 🐛 Troubleshooting

### Common Issues

**Build fails on Vercel**
- Check all TypeScript errors
- Ensure environment variables are set
- Verify Supabase connection

**Images not loading**
- Check Supabase storage bucket permissions
- Verify CORS settings in Supabase
- Ensure file URLs are publicly accessible

**Upload fails**
- Check file size limits
- Verify storage bucket exists
- Check RLS policies in Supabase

**Slow performance**
- Optimize image sizes before upload
- Add database indexes (already included in schema)
- Consider image compression

### Debug Commands
```bash
# Local development
npm run dev

# Check build locally
npm run build

# View Vercel logs
vercel logs
```

---

## 📊 Analytics & Monitoring

### Track Usage
- **Most used elements**: Check `popular_elements` view
- **Category stats**: Use admin stats page
- **User engagement**: Monitor gallery activity

### Performance Metrics
- **Load times**: Monitor with Vercel Analytics
- **Error rates**: Check Vercel Functions logs
- **Storage usage**: Monitor in Supabase dashboard

---

## 🔒 Security

### Access Control
- Admin functions require authentication
- File uploads are restricted to authenticated users
- Row Level Security (RLS) protects user data

### Best Practices
- Regularly update dependencies
- Monitor for suspicious upload activity
- Keep admin passwords secure
- Review file content before approval

---

## 🚀 You're Ready!

Your collage randomizer will auto-deploy from GitHub and is ready to:
1. **Accept bulk uploads** of your 1800 elements
2. **Generate infinite collage variations** 
3. **Save user creations** to a gallery
4. **Export high-resolution images**
5. **Scale to thousands of users**

**Next Phase Ideas:**
- AI-powered composition suggestions
- Collaborative collage creation
- Print-on-demand integration
- Mobile app version
- Advanced filtering and search

Happy collaging! 🎨
