# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TapBomb — real-time multiplayer dragon-snake battle game. Dragons run forward constantly; players only steer (keyboard/mouse/joystick) and breathe fireballs (SPACE on desktop, fire button on mobile). A fireball to the head kills; a body hit severs the tail at the impact point and the fallen segments become food orbs. Runs in browser and wraps to mobile via Capacitor.

# Team Claude Code Configuration

## Bash commands
- `npm run dev` — Vite dev server on port 3000 (frontend only)
- `npm run party:dev` — game server on port 1999 (PartyServer on wrangler dev, WebSocket)
- Both must run simultaneously for local development
- `npm run build` — production build
- `npm run typecheck` — TS check without emit
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests (`npm run test:watch` for watch mode)
- `npm run party:deploy` — deploy game server to Cloudflare Workers (tapbomb.vikaslavwanshi.workers.dev)

## Code style
- Use TypeScript with strict mode enabled
- Follow Airbnb style guide with Prettier formatting
- Destructure imports when possible (import { useState } from 'react')
- Use React native to develop mobile version of the application
- Use arrow functions for components and utilities
- IMPORTANT: Always include error handling in async functions

## Workflow
- Be sure to typecheck when you're done making code changes
- Prefer running single tests over the full test suite for performance
- YOU MUST write unit tests for new components and utilities
- Always update documentation when adding new features

## Repository structure

- GitHub remote: https://github.com/vikaslavwanshi/TapBomb.git
- Branch: `main`
- /src/components: Reusable React components
- /src/hooks: Custom React hooks
- /src/utils: Pure utility functions
- /src/types: TypeScript type definitions

## Development server
- Always use port 3000 by default
- Allow testing from https://*.cloudfront.net/ (for example, configure server.allowedHost in Vite)