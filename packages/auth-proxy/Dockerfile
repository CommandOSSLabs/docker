FROM openresty/openresty:1.25.3.1-2-alpine-fat

LABEL org.opencontainers.image.title="CommandOSS Auth Proxy" \
  org.opencontainers.image.description="OpenResty-based JWT authentication proxy" \
  org.opencontainers.image.source="https://github.com/CommandOSSLabs/docker" \
  org.opencontainers.image.url="https://github.com/CommandOSSLabs/docker" \
  org.opencontainers.image.vendor="CommandOSSLabs" \
  org.opencontainers.image.authors="CommandOSSLabs" \
  org.opencontainers.image.licenses="Apache-2.0"

# Install the JWT library
RUN opm get SkyLothar/lua-resty-jwt

# Copy our configuration
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY auth.lua /usr/local/openresty/lua/auth.lua

# Standard OpenResty port
EXPOSE 80
