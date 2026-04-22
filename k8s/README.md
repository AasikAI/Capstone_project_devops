# Kubernetes Manifests Placeholder
#
# This directory is reserved for your K8s orchestration work.
#
# Suggested structure:
# /k8s
#   /namespaces
#   /configmaps
#   /secrets
#   /deployments
#     auth-service-deployment.yaml
#     product-service-deployment.yaml
#     order-service-deployment.yaml
#     cart-service-deployment.yaml
#     user-profile-service-deployment.yaml
#     notification-service-deployment.yaml
#     frontend-deployment.yaml
#   /services
#     (ClusterIP for internal, LoadBalancer/NodePort for external)
#   /ingress
#   /pvcs
#     (PersistentVolumeClaims for each MongoDB)
#   /hpa
#     (HorizontalPodAutoscaler for each service)
#   /helm
#     (Helm chart for the full stack)
#   /argocd
#     (ArgoCD Application CRDs)
#   /github-actions
#     (CI/CD pipeline YAML)
