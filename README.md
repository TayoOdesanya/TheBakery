Restaurant Ordering System
A full-stack restaurant ordering system with real-time kitchen dashboard, Stripe payments, and inventory management.

🏗️ Architecture Overview
Technology Stack:

Frontend: React 18 + Vite + Tailwind CSS + Socket.IO Client
Backend: Node.js + Express + Prisma + PostgreSQL + Socket.IO + Stripe
Database: PostgreSQL with Prisma ORM
Payment: Stripe Checkout + Webhooks
Real-time: Socket.IO for kitchen dashboard updates
Deployment: Docker Compose for development
Key Features:

✅ Mobile-first customer ordering interface
✅ Real-time inventory management with atomic transactions
✅ Stripe payment integration with webhook handling
✅ Live kitchen dashboard with order status updates
✅ Admin dashboard for menu and inventory management
✅ JWT-based authentication for admin users
✅ Idempotent webhook processing to prevent double orders
✅ Race condition prevention with database transactions
🚀 Quick Start
Prerequisites
Node.js 18+
Docker & Docker Compose
Stripe account (for payments)
1. Clone and Setup Environment
bash
# Clone the repository
git clone <repository-url>
cd restaurant-ordering-system

# Setup backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Setup frontend environment  
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
2. Configure Stripe
Create a Stripe account at https://stripe.com
Get your test API keys from the Stripe dashboard
Update the environment files:
backend/.env:

env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
frontend/.env:

env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
3. Start the Application
bash
# Start all services with Docker Compose
docker-compose up --build

# The application will be available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001
# - PostgreSQL: localhost:5432
4. Initialize Database
bash
# In a new terminal, run database migrations and seed data
cd backend
npm install
npx prisma db push
npm run db:seed
5. Setup Stripe Webhooks (for testing payments)
Install Stripe CLI and forward webhooks to your local server:

bash
# Install Stripe CLI (https://stripe.com/docs/stripe-cli)
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from GitHub releases

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/stripe/webhook

# Copy the webhook signing secret and update backend/.env:
# STRIPE_WEBHOOK_SECRET=whsec_xxx_from_stripe_cli_output
🧪 Testing the System
Test a Complete Order Flow
Browse Menu: Visit http://localhost:5173
Add Items: Add items to cart and set table number (try table 5)
Checkout: Click "Proceed to Payment" (redirects to Stripe)
Test Payment: Use Stripe test card: 4242 4242 4242 4242
View Kitchen: Go to http://localhost:5173/admin/login
Username: admin
Password: admin123
Navigate to Kitchen dashboard to see real-time order for Table 5
Test Table Visibility:
Notice the "TABLE 5" prominently displayed in the kitchen dashboard
Click the Table 5 card in the active tables summary
Update order status and see "Mark Ready for Table 5" buttons
Switch between Table View and Time View to see different table displays
API Testing with curl
bash
# Get menu items
curl http://localhost:3001/api/menu

# Admin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get orders (requires admin token)
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
📁 Project Structure
restaurant-ordering-system/
├── docker-compose.yml           # Container orchestration
├── README.md                   # This file
├── backend/                    # Node.js backend
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── src/
│       ├── server.js           # Express server setup
│       ├── middleware/         # Auth & error handling
│       ├── routes/             # API endpoints
│       └── scripts/
│           └── seed.js         # Database seeding
└── frontend/                   # React frontend
    ├── Dockerfile
    ├── package.json
    ├── .env.example
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Main app component
        ├── context/            # React context (Auth, Cart)
        ├── components/         # Reusable components
        └── pages/              # Page components
🔐 Admin Credentials
Default admin user (created by seed script):

Username: admin
Password: admin123
Access admin features at:

Admin Dashboard: http://localhost:5173/admin/dashboard
Kitchen Dashboard: http://localhost:5173/kitchen
🔧 Key Implementation Details
Inventory Management & Race Conditions
The system prevents overselling through:

Atomic transactions when processing payments
SELECT FOR UPDATE equivalent with Prisma for inventory checks
Webhook idempotency using Stripe event IDs to prevent duplicate processing
javascript
// Example: Atomic inventory decrement in stripe webhook
const order = await prisma.$transaction(async (tx) => {
  // Create order
  const newOrder = await tx.order.create({...})
  
  // Decrement inventory with race condition protection
  const inventory = await tx.inventory.findUnique({
    where: { menuItemId: item.menuItemId }
  })
  
  if (inventory.quantityAvailable < item.quantity) {
    throw new Error('Insufficient inventory')
  }
  
  await tx.inventory.update({
    where: { menuItemId: item.menuItemId },
    data: { quantityAvailable: { decrement: item.quantity } }
  })
})
Stripe Integration
Checkout Sessions: Server-side session creation with metadata
Webhooks: checkout.session.completed for order creation
Idempotency: Prevents duplicate orders from webhook retries
Error Handling: Graceful payment failure handling
Real-time Updates
Socket.IO powers real-time kitchen dashboard updates:

New orders automatically appear in kitchen dashboard
Status changes (preparing → ready → delivered) broadcast instantly
Connection status indicator shows kitchen dashboard connectivity
🛠️ Development Commands
Backend Development
bash
cd backend

# Install dependencies
npm install

# Run in development mode
npm run dev

# Database operations
npx prisma db push       # Apply schema changes
npx prisma db seed      # Seed database
npx prisma studio       # GUI database browser
npx prisma migrate dev  # Create migrations
Frontend Development
bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
🔒 Security Considerations
Current Implementation (Development)
JWT tokens for admin authentication
Stripe webhook signature verification
CORS configuration for frontend
Input validation on API endpoints
Helmet.js for security headers
Rate limiting on API routes
Production Readiness Checklist
🚨 Before deploying to production:

Environment Security
 Change JWT_SECRET to a strong, unique secret
 Use production Stripe keys (live mode)
 Enable HTTPS/TLS encryption
 Set NODE_ENV=production
Database Security
 Use strong database passwords
 Enable SSL for database connections
 Set up database backups
 Configure connection pooling
API Security
 Implement stricter rate limiting
 Add request size limits
 Enable API request logging
 Add input sanitization
 Implement CSRF protection
Infrastructure
 Use a reverse proxy (nginx)
 Set up SSL certificates
 Configure firewalls
 Implement monitoring & alerts
 Set up log aggregation
🧪 Testing
Manual Test Scenarios
Order Flow Test
Add items to cart → Enter table number → Pay with Stripe test card
Verify order appears in kitchen dashboard
Test order status updates (preparing → ready → delivered)
Inventory Test
Set item inventory to 1 → Try to order 2 items → Should fail
Complete payment for 1 item → Item should show as out of stock
Real-time Test
Open kitchen dashboard in multiple browsers
Place order in one browser → Should appear in all kitchen dashboards instantly
Admin Test
Login to admin → Add/edit menu items → Update inventory
Verify changes reflected immediately in customer menu
Test Cards (Stripe)
# Successful payment
4242 4242 4242 4242

# Payment fails  
4000 0000 0000 0002

# 3D Secure authentication
4000 0000 0000 3220
📊 Database Schema
sql
-- Key tables and relationships
users (admin authentication)
  ├── id, username, password_hash, role

menu_items (restaurant menu)  
  ├── id, name, description, price, image_url, category, is_available
  └── → inventory (one-to-one)

inventory (stock management)
  ├── menu_item_id, quantity_available, low_stock_threshold  
  └── → menu_items

orders (customer orders)
  ├── id, table_number, status, total_amount, stripe_session_id
  └── → order_items (one-to-many)

order_items (order line items)  
  ├── order_id, menu_item_id, quantity, unit_price, subtotal
  └── → orders, menu_items

stripe_events (webhook idempotency)
  ├── stripe_event_id, event_type, processed_at, order_id
  └── → orders
🆘 Troubleshooting
Common Issues
"Webhook signature verification failed"

Ensure STRIPE_WEBHOOK_SECRET matches the Stripe CLI output
Restart the backend after updating the webhook secret
"Cannot connect to database"

Ensure PostgreSQL container is running: docker-compose ps
Check database credentials in backend/.env
"Orders not appearing in kitchen dashboard"

Check browser console for Socket.IO connection errors
Verify backend is running and accessible
Check for CORS issues between frontend/backend
"Payment successful but order not created"

Check backend logs for webhook processing errors
Verify Stripe webhook is forwarding to correct URL
Check for inventory/race condition errors
Debug Commands
bash
# Check container status
docker-compose ps

# View backend logs  
docker-compose logs backend

# View database logs
docker-compose logs postgres  

# Connect to database
docker-compose exec postgres psql -U restaurant_user -d restaurant_orders

# Reset everything
docker-compose down -v
docker-compose up --build
🚀 Production Deployment
For production deployment, consider:

Use managed services (AWS RDS for PostgreSQL, Redis for sessions)
Container orchestration (Kubernetes, Docker Swarm)
CDN for static assets and images
Load balancing for high availability
Database replication for read scalability
Monitoring (Prometheus, Grafana, error tracking)
📝 License
This project is for demonstration purposes. Adapt as needed for your use case.

Happy ordering! 🍕

For questions or issues, please check the troubleshooting section or review the implementation details in the code.

