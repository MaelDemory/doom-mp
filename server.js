#!/usr/bin/env node

/*
 * Serveur mono-port pour Doom multijoueur navigateur :
 * fichiers statiques (client doom-wasm + freedm.wad) + relais WebSocket
 * sur /ws/<room> + /health pour la plateforme.
 *
 * Logique de relais reprise de router.js du projet doom-web
 * (Copyright (C) 2021 Travis Burtrum (moparisthebest), AGPL-3.0-or-later) —
 * adaptée pour écouter HTTP et WebSocket sur le même port (contrainte Fly.io :
 * un seul service public, auto-stop piloté par le proxy TCP).
 *
 * Protocole du relais : chaque message binaire commence par 8 octets —
 * 4 octets « to » (destinataire) + 4 octets « from » (émetteur, mémorisé à la
 * première trame) ; le relais retire « to » et transmet au client visé.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 8080);
const ASSETS = path.join(__dirname, 'assets');

const MIMES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.wad': 'application/octet-stream',
  '.cfg': 'text/plain',
  '.map': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  const rel = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0].slice(1));
  const file = path.resolve(ASSETS, rel);
  if (!file.startsWith(ASSETS + path.sep)) {
    res.writeHead(404);
    res.end();
    return;
  }
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIMES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  });
});

const wss = new WebSocket.Server({ noServer: true, perMessageDeflate: false, clientTracking: false });
const games = new Map();

server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/ws')) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws, req) => {
  const game = req.url.substring(req.url.lastIndexOf('/') + 1);
  let clients = games.get(game);
  if (clients === undefined) {
    clients = [];
    games.set(game, clients);
  }
  clients.push(ws);
  console.log(`connexion à la partie ${game} (${clients.length} joueurs)`);

  ws.on('message', (data) => {
    if (ws.from === undefined) {
      ws.from = data.slice(4, 8).readUInt32LE();
    }
    const to = data.slice(0, 4).readUInt32LE();
    clients.forEach((client) => {
      if (client.from === to && client.readyState === WebSocket.OPEN) {
        client.send(data.slice(4));
      }
    });
  });

  ws.on('close', () => {
    const i = clients.map((c) => c.from).indexOf(ws.from);
    if (i !== -1) clients.splice(i, 1);
    if (clients.length === 0) games.delete(game);
    console.log(`déconnexion de la partie ${game}`);
  });

  ws.on('error', (err) => console.error('erreur ws :', err.message));
});

server.listen(PORT, () => console.log(`doom-web en écoute sur :${PORT}`));
