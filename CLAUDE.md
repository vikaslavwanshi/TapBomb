# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TapBomb — real-time multiplayer dragon-snake battle game. Players control a dragon (snake-like body) and tap/click to explode enemies, growing larger on each kill. Runs in browser and wraps to mobile via Capacitor.

# Team Claude Code Configuration

## Bash commands
- `npm run dev` — Vite dev server on port 3000 (frontend only)
- `npm run party:dev` — PartyKit server on port 1999 (WebSocket game server)
- Both must run simultaneously for local development
- `npm run build` — production build
- `npm run typecheck` — TS check without emit
- `npm run lint` — ESLint

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