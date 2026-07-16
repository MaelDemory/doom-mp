# Doom multijoueur dans le navigateur 👹

Un lien, et on joue : le Doom de 1993 (Chocolate Doom compilé en WebAssembly), multijoueur
jusqu'à 4 joueurs par WebSockets, avec le contenu 100 % libre **FreeDM** (Freedoom deathmatch).
Fonctionne aussi sur mobile (manettes virtuelles).

**Jouer : https://doom-mael.fly.dev** — crée une partie, partage le lien de la room, l'hôte lance.

## Architecture

Un seul conteneur, un seul port :

- `assets/` — client web (HTML/JS) + artefacts WASM compilés au build Docker + `freedm.wad`
- `server.js` — fichiers statiques + relais WebSocket (`/ws/<room>`) + `/health`
- `Dockerfile` — 3 étapes : compilation Emscripten de [doom-wasm], téléchargement de FreeDM, image Node finale

Tout étant HTTP/WebSocket, l'auto-stop Fly.io fonctionne : la machine s'éteint quand personne
ne joue et se rallume au premier visiteur (~0 €/mois au repos).

```bash
docker build -t doom-web .
docker run --rm -p 8080:8080 doom-web   # → http://localhost:8080
fly deploy                               # → prod
```

## Crédits & licences

- [chocolate-doom](https://github.com/chocolate-doom/chocolate-doom) (GPL-2.0) — le moteur
- [doom-wasm](https://github.com/cloudflare/doom-wasm) (GPL-2.0, Cloudflare) — le port WebAssembly + netcode WebSockets
- [doom-web](https://github.com/moparisthebest/doom-web) (AGPL-3.0, moparisthebest) — le front-end et le relais dont ce projet est adapté
- [Freedoom / FreeDM](https://freedoom.github.io/) (BSD) — le contenu de jeu libre

Ce dépôt est sous AGPL-3.0 (voir LICENSE.md), comme le projet dont il dérive.
Aucun fichier commercial d'id Software n'est distribué.
