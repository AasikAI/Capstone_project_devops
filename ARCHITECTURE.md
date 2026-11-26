# KubeCart — Architecture Design & Traffic Flow

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (port 3000)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Nginx)                      │
│   React Router  │  AuthContext  │  CartContext  │  Axios         │
└──┬──────────┬────────────┬─────────────┬──────────┬─────────────┘
   │          │            │             │          │
   │ :4001    │ :4002      │ :4003       │ :4004    │ :4005
   ▼          ▼            ▼             ▼          ▼
┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────────┐
│ Auth │ │ Product  │ │  Order   │ │ Cart │ │ Profile  │
│ Svc  │ │   Svc    │ │   Svc    │ │ Svc  │ │   Svc    │
└──┬───┘ └────┬─────┘ └────┬─────┘ └──┬───┘ └────┬─────┘
   │          │            │  │        │           │
   │     ┌────┘       ┌────┘  └───────┐│           │
   │     │            │               ││           │
   ▼     ▼            ▼         :4006 ▼▼           ▼
┌─────┐ ┌───────┐ ┌───────┐ ┌──────────────┐ ┌─────────┐
│Auth │ │Product│ │ Order │ │ Notification │ │Profile  │
│Mongo│ │Mongo  │ │ Mongo │ │     Svc      │ │ Mongo   │
└─────┘ └───────┘ └───────┘ └──────┬───────┘ └─────────┘
                                    │          ┌──────────┐
                            Cart    │          │Notif.    │
                           Mongo    │  SMTP    │ Mongo    │
                          ┌──────┐  └─────────►│          │
                          │Mongo │             └──────────┘
                          └──────┘
```

---

## 2. Service Port Map

| Service | Container Name | Port | Database |
|---|---|---|---|
| Frontend | `frontend` | 3000 | — |
| Auth Service | `auth-service` | 4001 | `auth-mongo:27017` |
| Product Service | `product-service` | 4002 | `product-mongo:27017` |
| Order Service | `order-service` | 4003 | `order-mongo:27017` |
| Cart Service | `cart-service` | 4004 | `cart-mongo:27017` |
| User Profile Service | `user-profile-service` | 4005 | `profile-mongo:27017` |
| Notification Service | `notification-service` | 4006 | `notification-mongo:27017` |

---

## 3. Traffic Flow — Key Scenarios

### 3.1 User Registration
```
Browser
  │
  ├─► POST /api/auth/register  ──► Auth Service (:4001)
  │                                    │
  │                                    ├─► Validate input (express-validator)
  │                                    ├─► Hash password (bcrypt, 12 rounds)
  │                                    ├─► Save User → auth-mongo
  │                                    ├─► Generate JWT accessToken + refreshToken
  │                                    └─► Return { user, accessToken, refreshToken }
  │
  └─◄ Store tokens in localStorage, update AuthContext
```

### 3.2 Browsing Products (Public)
```
Browser
  │
  ├─► GET /api/products?category=Electronics&page=1  ──► Product Service (:4002)
  │                                                         │
  │                                                         ├─► Build Mongoose filter
  │                                                         ├─► Query product-mongo
  │                                                         └─► Return paginated results
  │
  └─◄ ProductsPage renders product grid
```

### 3.3 Add to Cart (Authenticated)
```
Browser (with JWT Bearer token)
  │
  ├─► POST /api/cart/items { productId, quantity }  ──► Cart Service (:4004)
  │                                                       │
  │                                                       ├─► Verify JWT (local check)
  │                                                       ├─► GET /api/products/:id  ──► Product Service (:4002)
  │                                                       │       └─► Validates stock & price
  │                                                       ├─► Upsert cart in cart-mongo
  │                                                       │   (adds item or increments quantity)
  │                                                       └─► Return updated cart
  │
  └─◄ CartContext.cart updated → Navbar badge re-renders
```

### 3.4 Place Order (Full Inter-Service Flow)
```
Browser (with JWT)
  │
  ├─► POST /api/orders { items, shippingAddress, paymentMethod }
  │         │
  │         ▼
  │   Order Service (:4003)
  │         │
  │         ├─► Verify JWT
  │         ├─► POST /api/products/bulk { ids }  ──► Product Service (:4002)
  │         │         └─► Validates existence & stock for all items
  │         │
  │         ├─► Calculate totalAmount
  │         ├─► Create Order document → order-mongo
  │         │
  │         ├─► PATCH /api/products/:id/stock  ──► Product Service (:4002)  [for each item]
  │         │         └─► Decrements stock atomically
  │         │
  │         └─► POST /api/notifications/send  ──► Notification Service (:4006)  [fire-and-forget]
  │                   │
  │                   ├─► Log notification → notification-mongo
  │                   ├─► Build HTML email template
  │                   └─► Send via Nodemailer SMTP
  │
  └─◄ { order } — frontend redirects to /orders
```

### 3.5 Token Refresh (Transparent to User)
```
Browser makes API request
  │
  ├─► Request with expired accessToken ──► Any Service
  │         └─► Returns 401 Unauthorized
  │
  ├─► Axios interceptor triggers (api.js)
  │         └─► POST /api/auth/refresh { refreshToken }  ──► Auth Service
  │                   ├─► Verify refreshToken
  │                   ├─► Generate new accessToken + refreshToken (rotation)
  │                   └─► Return new tokens
  │
  └─► Retry original request with new accessToken
```

---

## 4. Database-Per-Service Pattern

Each microservice owns its own MongoDB instance — a key tenet of the database-per-service pattern:

```
┌─────────────────────────────────────────────────────┐
│  WHY DATABASE-PER-SERVICE?                          │
│                                                     │
│  ✅ Independent schema evolution                    │
│  ✅ Service isolation — one DB crash ≠ all down     │
│  ✅ Independent scaling of storage                  │
│  ✅ Tech heterogeneity possible per service         │
│  ✅ No shared state coupling between services       │
└─────────────────────────────────────────────────────┘
```

| Service | DB Name | Key Collections |
|---|---|---|
| Auth | `auth_db` | `users` |
| Product | `product_db` | `products` |
| Order | `order_db` | `orders` |
| Cart | `cart_db` | `carts` |
| Profile | `profile_db` | `profiles` |
| Notification | `notification_db` | `notificationlogs` |

---

## 5. Inter-Service Communication Map

```
                    ┌──────────────────────────────────────┐
                    │        SYNCHRONOUS REST CALLS        │
                    └──────────────────────────────────────┘

  Cart Service  ──── GET /api/products/:id ────────────► Product Service
               ──── POST /api/products/bulk ──────────► Product Service

  Order Service ──── POST /api/products/bulk ──────────► Product Service
               ──── PATCH /api/products/:id/stock ───► Product Service
               ──── POST /api/notifications/send ────► Notification Service
                                                           (fire-and-forget)
```

> **Note:** There is no API Gateway. The frontend calls each service directly by port.
> In Kubernetes, this will be replaced by ClusterIP Services with DNS resolution.

---

## 6. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Transport      │ HTTPS (add TLS in K8s Ingress)       │
│  Layer 2: CORS           │ Origin whitelist = FRONTEND_URL       │
│  Layer 3: Rate Limiting  │ express-rate-limit per service        │
│  Layer 4: Helmet.js      │ Security HTTP headers on all services │
│  Layer 5: JWT Validation │ Every protected route verifies token  │
│  Layer 6: Input Valid.   │ express-validator on all POST routes  │
│  Layer 7: Password Hash  │ bcrypt with salt rounds = 12          │
│  Layer 8: Container Sec. │ Non-root USER in all Dockerfiles      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Docker Compose Startup Order

```
Phase 1 (Databases):
  auth-mongo ─┐
  product-mongo ─┤
  order-mongo ─┤── All start simultaneously, wait for healthcheck
  cart-mongo ─┤
  profile-mongo ─┤
  notification-mongo ─┘

Phase 2 (Independent Services):
  auth-service      ← waits for: auth-mongo healthy
  product-service   ← waits for: product-mongo healthy
  user-profile-service ← waits for: profile-mongo healthy
  notification-service ← waits for: notification-mongo healthy

Phase 3 (Dependent Services):
  cart-service  ← waits for: cart-mongo + product-service healthy
  order-service ← waits for: order-mongo + product-service + notification-service healthy

Phase 4 (Frontend):
  frontend ← waits for: auth-service + product-service healthy
```

---

## 8. Kubernetes Migration Path

When you move to K8s, each Docker container becomes:

| Docker Compose | Kubernetes Equivalent |
|---|---|
| Service container | `Deployment` + `Pod` |
| MongoDB container | `StatefulSet` + `PersistentVolumeClaim` |
| Docker network | `ClusterIP Service` (DNS-based) |
| Port mapping | `NodePort` or `LoadBalancer Service` |
| Health check | `livenessProbe` + `readinessProbe` |
| `.env` variables | `ConfigMap` + `Secret` |
| Frontend (Nginx) | `Deployment` + `Ingress` with TLS |

The inter-service URLs (e.g., `http://product-service:4002`) map directly to **Kubernetes Service DNS names** when using the same service names in your K8s manifests.
