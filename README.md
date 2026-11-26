# KubeCart — E-Commerce Platform

> **Production-ready scaffolding** for a three-tier microservices application built for practising Kubernetes, Helm, ArgoCD, and CI/CD pipelines.

---

## 📁 Project Structure

```
CAPSTONE_PROJECT_K8S/
├── .env                          # Root secrets (JWT, SMTP)
├── .env.example                  # Template — copy & fill in
├── .gitignore
├── docker-compose.yml            # Full ecosystem orchestration
├── README.md
├── ARCHITECTURE.md               # Request flow & design diagrams
├── MANUAL_STEPS.md               # Steps you must complete manually
│
├── frontend/                     # React 18 + Tailwind CSS
│   ├── Dockerfile                # Multi-stage: CRA build → Nginx
│   ├── nginx.conf                # SPA-aware Nginx config
│   ├── .env / .env.example
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── App.js                # Router + providers
│       ├── contexts/             # AuthContext, CartContext
│       ├── services/api.js       # Axios instances (per service)
│       ├── components/           # Navbar, ProductCard, ProtectedRoute
│       └── pages/                # Home, Login, Register, Products, Cart, Orders, Profile
│
├── services/
│   ├── auth-service/             # JWT Auth — port 4001
│   ├── product-service/          # Product Catalog — port 4002
│   ├── order-service/            # Orders (calls Product + Notification) — port 4003
│   ├── cart-service/             # Shopping Cart (calls Product) — port 4004
│   ├── user-profile-service/     # User Profiles — port 4005
│   └── notification-service/     # Email via Nodemailer SMTP — port 4006
│
└── k8s/                          # Kubernetes manifests (your workspace)
    └── README.md
```

Each service follows the same internal layout:
```
service-name/
├── Dockerfile           # Multi-stage build, non-root USER
├── .env / .env.example
├── .dockerignore
├── package.json
└── src/
    ├── index.js         # Express app entry
    ├── config/
    │   ├── db.js        # Mongoose connection
    │   └── logger.js    # Winston logger
    ├── middleware/
    │   └── auth.middleware.js   # JWT verification
    ├── models/          # Mongoose schemas
    ├── controllers/     # Business logic
    └── routes/          # Express routers
```

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- Docker Desktop (≥ v24)
- Docker Compose v2

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd CAPSTONE_PROJECT_K8S

# Copy and fill in the root environment file
cp .env.example .env
```

Open `.env` and set:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Random 64-char string (see generation command below) |
| `JWT_REFRESH_SECRET` | Another random 64-char string |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password (see MANUAL_STEPS.md) |

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Build & Launch

```bash
docker compose up --build -d
```

This starts **13 containers** simultaneously:
- 1 × Frontend (Nginx serving React)
- 6 × Backend Microservices (Node/Express)
- 6 × MongoDB instances

### 3. Access the Application

| Service | URL |
|---|---|
| 🌐 Frontend | http://localhost:3000 |
| 🔐 Auth API | http://localhost:4001/health |
| 📦 Product API | http://localhost:4002/health |
| 📋 Order API | http://localhost:4003/health |
| 🛒 Cart API | http://localhost:4004/health |
| 👤 Profile API | http://localhost:4005/health |
| 📧 Notification API | http://localhost:4006/health |

> **Note:** Accessing any service URL directly in the browser (e.g. `http://localhost:4001/someRoute`) will **redirect to the frontend** if the route is unknown.

### 4. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f auth-service
docker compose logs -f order-service
```

### 5. Tear Down

```bash
# Stop and remove containers (preserves volumes/data)
docker compose down

# Full teardown including all data
docker compose down -v
```

---

## 🔑 API Endpoints Reference

### Auth Service (:4001)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, get JWT tokens |
| POST | `/api/auth/refresh` | ❌ | Refresh access token |
| POST | `/api/auth/logout` | ✅ | Logout, invalidate token |
| GET | `/api/auth/verify` | ✅ | Verify token & get user |

### Product Service (:4002)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | ❌ | List products (filter/sort/paginate) |
| GET | `/api/products/:id` | ❌ | Get single product |
| POST | `/api/products` | ✅ Admin | Create product |
| PUT | `/api/products/:id` | ✅ Admin | Update product |
| DELETE | `/api/products/:id` | ✅ Admin | Soft-delete product |
| PATCH | `/api/products/:id/stock` | Internal | Update stock |
| POST | `/api/products/bulk` | Internal | Fetch by IDs |

### Order Service (:4003)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | ✅ | Place order |
| GET | `/api/orders` | ✅ | My orders |
| GET | `/api/orders/:id` | ✅ | Order detail |
| PATCH | `/api/orders/:id/cancel` | ✅ | Cancel order |
| PATCH | `/api/orders/:id/status` | ✅ Admin | Update status |
| GET | `/api/orders/admin/all` | ✅ Admin | All orders |

### Cart Service (:4004)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/cart` | ✅ | Get cart |
| POST | `/api/cart/items` | ✅ | Add item |
| PATCH | `/api/cart/items/:productId` | ✅ | Update quantity |
| DELETE | `/api/cart/items/:productId` | ✅ | Remove item |
| DELETE | `/api/cart` | ✅ | Clear cart |

### User Profile Service (:4005)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/profiles/me` | ✅ | Get profile |
| PUT | `/api/profiles/me` | ✅ | Update profile |
| POST | `/api/profiles/me/addresses` | ✅ | Add address |
| DELETE | `/api/profiles/me/addresses/:id` | ✅ | Delete address |

### Notification Service (:4006)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/notifications/send` | Internal | Send email |
| GET | `/api/notifications/logs` | ❌ | View email logs |

---

## 🐳 Docker Details

### Non-Root Security
All service Dockerfiles follow this pattern:
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
...
RUN chown -R appuser:appgroup /app
USER appuser
```

### Multi-Stage Builds
- **Backend services**: `node:20-alpine` builder → minimal production image
- **Frontend**: `node:20-alpine` CRA builder → `nginx:alpine` server

### Health Checks
Every container has a health check. Docker Compose `depends_on` with `condition: service_healthy` ensures proper startup order:
```
MongoDB → Services → order-service (waits for product + notification) → frontend
```

---

## 🔒 Security Features

- **JWT Access Tokens** (15 min) + **Refresh Tokens** (7 days)
- **bcrypt** password hashing (salt rounds: 12)
- **Helmet.js** HTTP security headers on all services
- **Rate limiting** (express-rate-limit) per service
- **CORS** restricted to `FRONTEND_URL`
- **Non-root containers** — all images run as `appuser`
- **Input validation** with `express-validator`
- **Redirect guard** — unknown API routes redirect to frontend

---

## 🧪 Testing the Backend (cURL)

```bash
# Register
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get products (store token from login response)
TOKEN="<your_access_token>"
curl http://localhost:4002/api/products

# Add to cart
curl -X POST http://localhost:4004/api/cart/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<productId>","quantity":2}'
```

---

## ☸️ Kubernetes Deployment (Your Next Step)

The `/k8s` directory is your workspace. Each service image is independently publishable:

```bash
# Build and tag for a registry
docker build -t your-registry/auth-service:v1.0.0 ./services/auth-service
docker push your-registry/auth-service:v1.0.0

# Repeat for all 6 services + frontend
```

See `ARCHITECTURE.md` for the full design and `MANUAL_STEPS.md` for required manual setup actions.
