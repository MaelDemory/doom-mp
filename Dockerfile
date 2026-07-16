# Étape 1 : compilation de doom-wasm (Chocolate Doom → WebAssembly, netcode WebSockets)
FROM emscripten/emsdk:3.1.61 AS wasm
RUN apt-get update && apt-get install -y --no-install-recommends autoconf automake libtool pkg-config \
  && rm -rf /var/lib/apt/lists/*
# Commit épinglé de cloudflare/doom-wasm pour un build reproductible.
RUN git clone https://github.com/cloudflare/doom-wasm.git /doom-wasm \
  && cd /doom-wasm && git checkout 65e0d3ae2ffa604155eebd96ed40da6567bd08f4
WORKDIR /doom-wasm
RUN emconfigure autoreconf -fiv \
  && ac_cv_exeext=".html" emconfigure ./configure --host=none-none-none \
  && emmake make -j"$(nproc)"

# Étape 2 : récupération de FreeDM (IWAD deathmatch 100 % libre du projet Freedoom)
FROM alpine:3.20 AS wad
RUN apk add --no-cache curl unzip \
  && curl -fsSL -o /tmp/freedm.zip https://github.com/freedoom/freedoom/releases/download/v0.13.0/freedm-0.13.0.zip \
  && unzip -j /tmp/freedm.zip "*/freedm.wad" -d /wad

# Étape 3 : image finale — serveur Node mono-port (statique + relais WebSocket)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY assets ./assets
COPY --from=wasm /doom-wasm/src/websockets-doom.js /doom-wasm/src/websockets-doom.wasm /doom-wasm/src/websockets-doom.wasm.map ./assets/
COPY --from=wad /wad/freedm.wad ./assets/freedm.wad
EXPOSE 8080
CMD ["node", "server.js"]
