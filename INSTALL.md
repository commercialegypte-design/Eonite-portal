# 🚀 EONITE Portal - Installation Instructions

## ✅ Your Supabase Project is Configured!

**Project Name**: Dashboard  
**Project ID**: fbirmmevnwzycngsqdm  
**Project URL**: https://fbirmmevnwzycngsqdm.supabase.co

Your `.env.local` file is already configured with your credentials!

---

## 📥 STEP 1: Download All Files

All project files are ready in this folder. Download everything to your computer.

**Option A: Using Terminal (Recommended)**
```bash
# Create project directory
mkdir ~/eonite-portal
cd ~/eonite-portal

# Copy all files (you'll need to download from Claude first)
```

**Option B: Manual Download**
Download all files from this folder to your computer.

---

## 🔧 STEP 2: Install Dependencies

Open terminal in the project folder and run:

```bash
npm install
```

This will install all required packages (~5 minutes on first run).

---

## ⚡ STEP 3: Start Development Server

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 15.0.3
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 2.3s
```

---

## 🌐 STEP 4: Open in Browser

Visit: **http://localhost:3000**

You should see the login page!

---

## 🎯 NEXT STEPS: Complete Supabase Setup

Now go back to your Supabase dashboard and complete these steps:

### A. Run Database Migrations (CRITICAL!)

1. In Supabase, go to **SQL Editor**
2. Click **"+ New query"**
3. Copy content from `supabase/migrations/001_initial_schema.sql`
4. Paste and click **"Run"**
5. Repeat for:
   - `002_rls_policies.sql`
   - `003_seed_data.sql`
   - `004_storage_setup.sql`

### B. Create Storage Buckets

1. In Supabase, go to **Storage**
2. Create these buckets (one by one):

| Bucket Name | Public? |
|-------------|---------|
| bat-files | ❌ No |
| invoices | ❌ No |
| delivery-notes | ❌ No |
| client-logos | ❌ No |
| product-images | ✅ Yes |
| message-attachments | ❌ No |

### C. Create Admin User

1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - Email: `walid@eonite.fr`
   - Password: (your choice - save it!)
   - **✅ CHECK "Auto Confirm User"**
4. Click **"Create user"**
5. **Copy the User ID (UUID)**

### D. Make User Admin

1. Go to **SQL Editor**
2. Create new query
3. Paste this (replace YOUR_USER_ID):

```sql
UPDATE profiles 
SET role = 'admin', 
    company_name = 'EONITE SARL',
    contact_name = 'Walid'
WHERE id = 'YOUR_USER_ID_HERE';
```

4. Click **"Run"**

---

## 🧪 STEP 5: Test Login

1. Go to http://localhost:3000
2. Login with your admin credentials
3. You should be redirected to `/dashboard`

**If it works, you're done with setup! 🎉**

---

## 📁 Project Structure

```
eonite-portal/
├── .env.local              ✅ Already configured!
├── app/                    React pages
│   ├── login/              ✅ Complete
│   ├── signup/             ✅ Complete
│   └── (client)/           🔨 Build these pages
├── supabase/migrations/    📊 Run these in Supabase
├── components/             🎨 UI components
└── lib/                    🔧 Utilities
```

---

## 🔨 What to Build Next

The foundation is complete! Now build the pages:

1. **Client Dashboard** - `app/(client)/dashboard/page.tsx`
2. **Products Page** - `app/(client)/products/page.tsx`
3. **Admin Inventory** - `app/(admin)/admin/inventory/page.tsx`

Follow the patterns in `app/login/page.tsx` as examples.

---

## 🐛 Troubleshooting

### "Module not found"
```bash
rm -rf node_modules
npm install
```

### "Cannot connect to Supabase"
- Check `.env.local` has correct credentials
- Verify Supabase project is active
- Check you ran the migrations

### "User not authenticated"
- Make sure you created the admin user
- Verify the UPDATE query ran successfully
- Check profile has role='admin' in Supabase

### Port 3000 already in use
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

## 📞 Support

- **README.md** - Project overview
- **DEPLOYMENT.md** - Production deployment
- **QUICK_REFERENCE.md** - Commands & tips
- **START_HERE.md** - Complete guide

---

## ✅ Setup Checklist

- [ ] Downloaded all project files
- [ ] Ran `npm install`
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:3000
- [ ] Ran SQL migration 001_initial_schema.sql in Supabase
- [ ] Ran SQL migration 002_rls_policies.sql in Supabase
- [ ] Ran SQL migration 003_seed_data.sql in Supabase
- [ ] Ran SQL migration 004_storage_setup.sql in Supabase
- [ ] Created 6 storage buckets in Supabase
- [ ] Created admin user in Supabase Authentication
- [ ] Made user admin with UPDATE query
- [ ] Successfully logged in at http://localhost:3000

---

## 🎉 Ready to Code!

Once you can login successfully, you're ready to start building the pages!

**Next**: Read `README.md` for development guide.

Good luck! 🚀
