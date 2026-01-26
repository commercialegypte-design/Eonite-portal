# EONITE Client Portal

Complete client portal for EONITE SARL's kraft paper bag business with real-time inventory management, order tracking, and messaging system.

## 🎯 Features

### Client Portal
- ✅ **Dashboard**: Real-time stock alerts, order tracking, scheduled deliveries
- ✅ **Products**: Manage custom products with BAT files and specifications
- ✅ **Catalog**: Browse all available products with promotions
- ✅ **Quote Calculator**: Instant pricing with customization options
- ✅ **Messages**: Real-time chat with EONITE team (Sarah, support)
- ✅ **Documents**: Access invoices, delivery notes, BAT files
- ✅ **Settings**: Manage profile, addresses, and notification preferences

### Admin Panel
- ✅ **Client Management**: View and manage all clients
- ✅ **Order Management**: Track production progress, update status
- ✅ **Inventory System**: Real-time stock management with automatic alerts
- ✅ **Messaging**: Reply to client messages, manage conversations
- ✅ **Product Catalog**: Add/edit products, manage promotions

### Technical Features
- ✅ Real-time updates using Supabase Realtime
- ✅ Row Level Security (RLS) for data protection
- ✅ Automatic stock level alerts
- ✅ PDF generation for documents
- ✅ File upload/storage for BAT files and invoices
- ✅ Responsive design (mobile, tablet, desktop)

## 📂 Project Structure

```
eonite-portal/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/page.tsx        # ✅ Login page
│   │   └── signup/page.tsx       # ✅ Signup page
│   ├── (client)/                 # Client portal routes
│   │   ├── dashboard/            # 🔨 Dashboard (needs completion)
│   │   ├── products/             # 🔨 Products management
│   │   ├── catalog/              # 🔨 Product catalog
│   │   ├── quote/                # 🔨 Quote calculator
│   │   ├── messages/             # 🔨 Messaging system
│   │   ├── documents/            # 🔨 Documents viewer
│   │   └── settings/             # 🔨 User settings
│   ├── (admin)/                  # Admin panel routes
│   │   └── admin/
│   │       ├── dashboard/        # 🔨 Admin dashboard
│   │       ├── clients/          # 🔨 Client management
│   │       ├── orders/           # 🔨 Order management
│   │       ├── inventory/        # 🔨 Inventory management
│   │       ├── messages/         # 🔨 Message center
│   │       └── products/         # 🔨 Product management
│   ├── api/                      # API routes
│   │   ├── orders/route.ts       # 🔨 Order operations
│   │   ├── inventory/route.ts    # 🔨 Inventory operations
│   │   └── pdf/route.ts          # 🔨 PDF generation
│   ├── globals.css               # ✅ Global styles
│   ├── layout.tsx                # ✅ Root layout
│   └── page.tsx                  # ✅ Landing page
│
├── components/                   # React components
│   ├── ui/                       # UI components (shadcn/ui style)
│   │   ├── button.tsx            # ✅ Button component
│   │   ├── card.tsx              # ✅ Card component
│   │   ├── input.tsx             # ✅ Input component
│   │   └── label.tsx             # ✅ Label component
│   ├── client/                   # Client-specific components
│   │   ├── StockAlert.tsx        # 🔨 Stock alert component
│   │   ├── OrderTracking.tsx     # 🔨 Order tracking timeline
│   │   └── QuoteCalculator.tsx   # 🔨 Quote calculation
│   └── admin/                    # Admin-specific components
│       ├── InventoryManager.tsx  # 🔨 Inventory management
│       ├── OrderManager.tsx      # 🔨 Order management
│       └── ClientMessaging.tsx   # 🔨 Admin messaging
│
├── lib/                          # Utility libraries
│   ├── supabase/
│   │   ├── client.ts             # ✅ Supabase client (browser)
│   │   └── server.ts             # ✅ Supabase server (SSR)
│   ├── utils.ts                  # ✅ Helper functions
│   └── pdf-generator.ts          # 🔨 PDF generation utilities
│
├── types/
│   └── database.types.ts         # ✅ TypeScript database types
│
├── supabase/                     # Supabase configuration
│   └── migrations/
│       ├── 001_initial_schema.sql    # ✅ Database schema
│       ├── 002_rls_policies.sql      # ✅ Security policies
│       ├── 003_seed_data.sql         # ✅ Sample data
│       └── 004_storage_setup.sql     # ✅ File storage
│
├── middleware.ts                 # ✅ Auth middleware
├── next.config.mjs               # ✅ Next.js config
├── tailwind.config.ts            # ✅ Tailwind config
├── tsconfig.json                 # ✅ TypeScript config
├── package.json                  # ✅ Dependencies
├── DEPLOYMENT.md                 # ✅ Deployment guide
└── README.md                     # ✅ This file

Legend:
✅ = Completed and functional
🔨 = Needs to be implemented
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Supabase

Follow the detailed instructions in `DEPLOYMENT.md` for:
- Creating Supabase project
- Running database migrations
- Setting up storage buckets
- Creating admin user

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 📋 What's Already Built

### ✅ Foundational Structure
- Next.js 14 with App Router
- TypeScript configuration
- Tailwind CSS styling
- Supabase integration
- Authentication system (login/signup)
- Protected routes with middleware
- Database schema with RLS policies

### ✅ Core Components
- Button, Card, Input, Label components
- Utility functions for formatting
- Client and server Supabase helpers
- TypeScript types for database

## 🔨 What Needs To Be Built

I've created the foundation, database, authentication, and configuration. Here's what you need to complete:

### Priority 1: Client Dashboard Pages

1. **Dashboard** (`app/(client)/dashboard/page.tsx`)
   - Stock alert cards
   - Order tracking timeline
   - Scheduled deliveries
   - Quick stats

2. **Products** (`app/(client)/products/page.tsx`)
   - List client's custom products
   - Display inventory levels
   - Reorder functionality

3. **Messages** (`app/(client)/messages/page.tsx`)
   - Real-time chat interface
   - Conversation list
   - Message composer

### Priority 2: Admin Panel

1. **Admin Dashboard** (`app/(admin)/admin/dashboard/page.tsx`)
   - Overview statistics
   - Recent orders
   - Low stock alerts

2. **Inventory Management** (`app/(admin)/admin/inventory/page.tsx`)
   - Update stock levels
   - Set alert thresholds
   - Bulk operations

3. **Order Management** (`app/(admin)/admin/orders/page.tsx`)
   - Order list with filters
   - Update production progress
   - Change order status

### Priority 3: Additional Features

- Quote calculator with real-time pricing
- Document viewer with PDF generation
- Settings page with preferences
- Email notifications (optional)

## 💾 Database Schema

The complete schema is in `/supabase/migrations/`. Key tables:

- **profiles**: User information and roles
- **products**: Product catalog
- **client_products**: Custom client products
- **inventory**: Stock levels per client product
- **orders**: Order tracking with status
- **messages**: Real-time messaging
- **documents**: File storage references
- **notifications**: System notifications

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Clients can only access their own data
- Admins have full access
- JWT-based authentication
- Secure file storage with access policies

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Touch-friendly interface
- Optimized for tablets

## 🎨 Design System

- **Colors**: 
  - Primary: EONITE Green (#2d5016)
  - Secondary: Warm grays
  - Accents: Red (alerts), Yellow (warnings), Green (success)
  
- **Typography**: Inter font family
  
- **Components**: Based on shadcn/ui patterns

## 🧪 Testing Checklist

After completing the pages:

- [ ] User can register and login
- [ ] Client sees their dashboard with stock alerts
- [ ] Client can view their custom products
- [ ] Client can browse catalog
- [ ] Client can create quotes
- [ ] Client can send/receive messages
- [ ] Client can view documents
- [ ] Admin can manage all orders
- [ ] Admin can update inventory
- [ ] Admin can reply to messages
- [ ] Real-time updates work
- [ ] Stock alerts trigger correctly

## 📖 Next Steps

1. **Complete the pages** following the structure in the original HTML design
2. **Test locally** with sample data
3. **Deploy to VPS** following `DEPLOYMENT.md`
4. **Add admin user** in Supabase
5. **Create test client** accounts
6. **Load real products** into catalog

## 🤝 Development Tips

### Working with Supabase

```typescript
// Query data
const { data, error } = await supabase
  .from('orders')
  .select('*, client_products(*)')
  .eq('client_id', userId)
  
// Real-time subscriptions
supabase
  .channel('messages')
  .on('postgres_changes', { ... }, callback)
  .subscribe()
```

### Component Pattern

```typescript
// Always use 'use client' for interactive components
'use client'

export default function MyComponent() {
  // Your component code
}
```

### Server Actions

```typescript
// app/actions/orders.ts
'use server'

export async function createOrder(formData: FormData) {
  const supabase = await createClient()
  // Your server logic
}
```

## 📦 Dependencies

- **Next.js 15**: React framework
- **Supabase**: Backend (auth, database, storage)
- **Tailwind CSS**: Styling
- **Radix UI**: Accessible components
- **Lucide React**: Icons
- **jsPDF**: PDF generation
- **date-fns**: Date formatting

## 🆘 Support

If you need help:
1. Check `DEPLOYMENT.md` for setup issues
2. Review Supabase docs: https://supabase.com/docs
3. Check Next.js docs: https://nextjs.org/docs

## 📄 License

Proprietary - EONITE SARL

---

Built with ❤️ for EONITE SARL
