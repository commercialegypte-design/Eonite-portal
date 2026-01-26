# EONITE Portal - Quick Reference

## 🚀 Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Supabase
```bash
# Generate types from Supabase (requires Supabase CLI)
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts

# Pull database schema
supabase db pull

# Reset local database
supabase db reset
```

### VPS Deployment
```bash
# Upload files to VPS
scp -r * root@your-vps-ip:/var/www/eonite-portal/

# Or use rsync (better for updates)
rsync -avz --exclude node_modules --exclude .next --exclude .git * root@your-vps-ip:/var/www/eonite-portal/

# SSH into VPS
ssh root@your-vps-ip

# Rebuild on VPS
cd /var/www/eonite-portal
npm install
npm run build
pm2 restart eonite-portal

# View logs
pm2 logs eonite-portal

# Monitor
pm2 monit
```

## 📁 Key File Locations

### Configuration Files
- **Environment**: `.env.local`
- **Next.js config**: `next.config.mjs`
- **Tailwind**: `tailwind.config.ts`
- **TypeScript**: `tsconfig.json`

### Database
- **Migrations**: `supabase/migrations/*.sql`
- **Types**: `types/database.types.ts`

### Authentication
- **Middleware**: `middleware.ts`
- **Supabase clients**: `lib/supabase/client.ts` & `server.ts`

### UI Components
- **Base components**: `components/ui/*.tsx`
- **Client components**: `components/client/*.tsx`
- **Admin components**: `components/admin/*.tsx`

## 🔑 Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=          # From Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # From Supabase dashboard
NEXT_PUBLIC_APP_URL=               # Your domain or localhost
SUPABASE_SERVICE_ROLE_KEY=         # Optional, for admin operations
```

## 🎯 Feature Checklist

### Completed ✅
- [x] Database schema
- [x] Authentication system
- [x] Login/Signup pages
- [x] Middleware protection
- [x] Basic UI components
- [x] Supabase integration

### To Implement 🔨
- [ ] Client Dashboard
- [ ] Products page
- [ ] Catalog page
- [ ] Quote calculator
- [ ] Messaging system
- [ ] Documents viewer
- [ ] Admin dashboard
- [ ] Inventory management
- [ ] Order management
- [ ] PDF generation

## 📊 Database Quick Reference

### Key Tables
```sql
-- Users and profiles
profiles (id, role, company_name, email, ...)

-- Products
products (id, name, size, base_price, ...)
client_products (id, client_id, product_id, ...)

-- Inventory
inventory (id, client_product_id, quantity, ...)

-- Orders
orders (id, order_number, client_id, status, ...)

-- Messages
conversations (id, client_id, admin_id, ...)
messages (id, conversation_id, sender_id, content, ...)
```

### Common Queries

```sql
-- Get client's products with inventory
SELECT cp.*, i.quantity, p.name
FROM client_products cp
JOIN products p ON cp.product_id = p.id
LEFT JOIN inventory i ON i.client_product_id = cp.id
WHERE cp.client_id = 'USER_ID';

-- Get all orders for a client
SELECT o.*, cp.custom_name
FROM orders o
LEFT JOIN client_products cp ON o.client_product_id = cp.id
WHERE o.client_id = 'USER_ID'
ORDER BY o.created_at DESC;

-- Update inventory
UPDATE inventory 
SET quantity = 1500, last_updated = NOW()
WHERE client_product_id = 'PRODUCT_ID';
```

## 🔐 Security Notes

### RLS (Row Level Security)
- All tables have RLS enabled
- Clients can only see their own data
- Admins can see all data
- Check policies in `002_rls_policies.sql`

### API Routes
- Always validate user authentication
- Use Supabase server client for API routes
- Never expose service role key in client code

## 🐛 Troubleshooting

### "User not authenticated" error
```bash
# Check if user session is valid
# In browser console:
const { data } = await supabase.auth.getSession()
console.log(data)
```

### Can't see data in tables
```bash
# Check RLS policies
# Temporarily disable RLS for testing (NOT in production):
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

# Re-enable after testing:
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Build errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build

# Check TypeScript errors
npm run type-check
```

### PM2 won't start
```bash
# Check logs
pm2 logs eonite-portal --lines 100

# Delete and restart
pm2 delete eonite-portal
pm2 start npm --name "eonite-portal" -- start

# Save configuration
pm2 save
```

## 📚 Useful Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/primitives/docs
- **PM2 Docs**: https://pm2.keymetrics.io/docs

## 🎨 Design Tokens

```css
/* Colors */
--eonite-green: #2d5016
--eonite-green-dark: #1f3a0e
--eonite-green-light: #4a7022

/* Spacing */
--spacing-sm: 0.5rem
--spacing-md: 1rem
--spacing-lg: 1.5rem
--spacing-xl: 2rem

/* Border radius */
--radius: 0.5rem
--radius-lg: 0.75rem
--radius-xl: 1rem
```

## 🔄 Update Process

1. Make changes locally
2. Test thoroughly
3. Commit to git (if using version control)
4. Upload to VPS
5. Rebuild and restart:
   ```bash
   npm install
   npm run build
   pm2 restart eonite-portal
   ```
6. Check logs: `pm2 logs`
7. Test in browser

## 📞 Emergency Contacts

If site goes down:
1. Check PM2 status: `pm2 status`
2. Check Nginx: `systemctl status nginx`
3. Check logs: `pm2 logs` and `/var/log/nginx/error.log`
4. Restart services:
   ```bash
   pm2 restart eonite-portal
   systemctl restart nginx
   ```

## 🎉 Success Criteria

Your portal is working when:
- ✅ Login works for both admin and client
- ✅ Dashboard shows real data from Supabase
- ✅ Stock alerts appear for low inventory
- ✅ Messages send/receive in real-time
- ✅ Documents can be uploaded and viewed
- ✅ Admin can update inventory
- ✅ HTTPS works (green padlock in browser)

