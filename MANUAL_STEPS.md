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

The product catalog is empty on first run. You must insert products manually.

**Option A: Use cURL (after starting containers)**
```bash
# Login as admin first — you need to manually set role='admin' in MongoDB OR
# use the register endpoint and update role directly in the DB.

# Register a user
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Admin","lastName":"User","email":"admin@shopease.com","password":"Admin@1234"}'

# Use mongosh to promote to admin role:
docker exec -it product-mongo mongosh product_db \
  --eval "db.products.insertMany([
    {name:'Wireless Headphones',description:'Premium noise-cancelling headphones',price:2999,category:'Electronics',stock:50,sku:'ELEC-001',brand:'SoundMax',isActive:true,rating:{average:4.5,count:120},tags:['audio','wireless']},
    {name:'Running Shoes',description:'Lightweight breathable running shoes',price:1499,category:'Sports',stock:30,sku:'SPRT-001',brand:'FleetFoot',isActive:true,rating:{average:4.2,count:85},tags:['shoes','running']},
    {name:'JavaScript: The Good Parts',description:'A deep dive into the best features of JS',price:499,category:'Books',stock:100,sku:'BOOK-001',brand:'OReilly',isActive:true,rating:{average:4.8,count:340},tags:['programming','javascript']},
    {name:'Smart Watch',description:'Fitness and health tracking smartwatch',price:5999,category:'Electronics',stock:20,sku:'ELEC-002',brand:'TimePro',isActive:true,rating:{average:4.3,count:67},tags:['wearable','fitness']},
    {name:'Cotton T-Shirt',description:'Comfortable everyday cotton tee',price:299,category:'Clothing',stock:200,sku:'CLTH-001',brand:'BasicWear',isActive:true,rating:{average:4.0,count:210},tags:['casual','clothing']},
    {name:'Yoga Mat',description:'Non-slip eco-friendly yoga mat',price:799,category:'Sports',stock:45,sku:'SPRT-002',brand:'ZenFlex',isActive:true,rating:{average:4.6,count:95},tags:['yoga','fitness']}
  ])"
```

**Option B: Promote a user to admin, then use the UI**
```bash
# Connect to auth-mongo and promote a registered user
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
