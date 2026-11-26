# Manual Steps — What You Must Complete Before Running

This file lists every external setup action you must perform yourself before the application is fully functional.

---

## ✅ Step 1 — Generate Strong JWT Secrets

The JWT secrets in `.env` must be changed before any deployment.

**Run this command twice** to generate two unique secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Open `.env` and replace:
```env
JWT_SECRET=<paste first output here>
JWT_REFRESH_SECRET=<paste second output here>
```

> ⚠️ **Never use the placeholder values in any environment beyond local dev.**

---

## ✅ Step 2 — Configure Gmail SMTP for Email Notifications

The `notification-service` sends transactional emails via **Nodemailer + Gmail SMTP**.

### 2.1 — Enable 2-Factor Authentication on Your Google Account
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Navigate to **Security → 2-Step Verification**
3. Turn it ON if not already enabled

### 2.2 — Generate a Gmail App Password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select **App: Mail** and **Device: Other (Custom name)**
3. Enter name: `ShopEase Notification`
4. Click **Generate**
5. Copy the **16-character password** shown (with spaces removed)

### 2.3 — Update `.env` with SMTP Credentials
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx        # 16-char App Password (spaces OK)
SMTP_FROM=ShopEase <your-actual-email@gmail.com>
```

### 2.4 — Alternative: Use Mailtrap (Dev/Test Without Real Emails)
[Mailtrap.io](https://mailtrap.io) is a free fake SMTP inbox — emails are captured and never delivered.

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=<your-mailtrap-username>
SMTP_PASS=<your-mailtrap-password>
SMTP_FROM=ShopEase <noreply@shopease.local>
```
Sign up free at mailtrap.io → Inboxes → SMTP Settings → copy credentials.

---

## ✅ Step 3 — Seed Sample Products

The product catalog is empty on first run. Use the included seed script to add a full catalog with product images.

**Recommended (one command):**
```bash
cd services/product-service
npm run seed:products
```

This script seeds **all supported categories**:
- Electronics
- Clothing
- Books
- Home & Garden
- Sports
- Toys
- Beauty
- Other

Each category gets **10 products** with category-relevant `imageUrl` values, for a total of **80 products**.

**Alternative: add/edit products manually from the admin API**
```bash
# Register a user
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Admin","lastName":"User","email":"admin@shopease.com","password":"Admin@1234"}'

# Promote the user to admin
docker exec -it auth-mongo mongosh auth_db \
  --eval 'db.users.updateOne({email:"admin@shopease.com"},{$set:{role:"admin"}})'
```
Then log in as that user and use `POST /api/products` with Authorization header.

---

## ✅ Step 4 — Verify All Containers Are Healthy

After `docker compose up --build -d`:
```bash
docker compose ps
```
All containers should show `healthy` or `running`.

If any service shows `unhealthy`, inspect logs:
```bash
docker compose logs <service-name>
```

Common issues:
- **MongoDB not ready**: Increase `start_period` in health check or wait longer
- **JWT_SECRET not set**: Check your `.env` file is in the project root
- **SMTP errors**: Notification service logs will show SMTP failures — emails fail silently so the app still works

---

## ✅ Step 5 — Push Images to a Container Registry (for K8s)

Before deploying to Kubernetes, you need to push images to a registry.

### Docker Hub
```bash
docker login

# Build and tag (run for each service)
docker build -t <your-dockerhub-username>/shopease-auth-service:v1.0.0 ./services/auth-service
docker build -t <your-dockerhub-username>/shopease-product-service:v1.0.0 ./services/product-service
docker build -t <your-dockerhub-username>/shopease-order-service:v1.0.0 ./services/order-service
docker build -t <your-dockerhub-username>/shopease-cart-service:v1.0.0 ./services/cart-service
docker build -t <your-dockerhub-username>/shopease-user-profile-service:v1.0.0 ./services/user-profile-service
docker build -t <your-dockerhub-username>/shopease-notification-service:v1.0.0 ./services/notification-service
docker build -t <your-dockerhub-username>/shopease-frontend:v1.0.0 ./frontend

# Push all
docker push <your-dockerhub-username>/shopease-auth-service:v1.0.0
# ... (repeat for all)
```

### AWS ECR (if using EKS)
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com
docker build -t <account-id>.dkr.ecr.ap-south-1.amazonaws.com/shopease-auth-service:v1.0.0 ./services/auth-service
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/shopease-auth-service:v1.0.0
```

---

## ✅ Step 6 — Configure Kubernetes Secrets

When deploying to K8s, do NOT use `.env` files. Use Kubernetes Secrets:

```bash
kubectl create namespace shopease

kubectl create secret generic shopease-secrets \
  --namespace shopease \
  --from-literal=JWT_SECRET="<your-jwt-secret>" \
  --from-literal=JWT_REFRESH_SECRET="<your-jwt-refresh-secret>" \
  --from-literal=SMTP_USER="your-email@gmail.com" \
  --from-literal=SMTP_PASS="your-16-char-app-password"
```

Then reference in your Deployment manifests:
```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: shopease-secrets
        key: JWT_SECRET
```

---

## ✅ Step 7 — Configure CORS for K8s/Production

When deploying behind an Ingress with a domain:

1. Update the root `.env` (or K8s ConfigMap):
   ```
   FRONTEND_URL=https://your-domain.com
   ```

2. The backend services use `ALLOWED_ORIGINS` from `FRONTEND_URL` for CORS.

3. Update the frontend `.env` before building the Docker image:
   ```
   REACT_APP_AUTH_SERVICE_URL=https://auth.your-domain.com
   REACT_APP_PRODUCT_SERVICE_URL=https://products.your-domain.com
   # ...etc (or use the same domain with path-based routing)
   ```

---

## 📋 Summary Checklist

| # | Task | Status |
|---|---|---|
| 1 | Generate & set `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env` | ⬜ |
| 2 | Set up Gmail App Password OR Mailtrap SMTP credentials | ⬜ |
| 3 | Seed sample products via mongosh or cURL | ⬜ |
| 4 | Verify all containers healthy with `docker compose ps` | ⬜ |
| 5 | Build & push Docker images to your container registry | ⬜ |
| 6 | Create Kubernetes namespace and Secrets | ⬜ |
| 7 | Update CORS origins for production domain | ⬜ |
