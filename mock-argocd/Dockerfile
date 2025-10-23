FROM nginx:alpine

# Mock ArgoCD API 서버
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
