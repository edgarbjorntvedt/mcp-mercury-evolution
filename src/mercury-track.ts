#!/usr/bin/env node

/**
 * CLI interface for Mercury Evolution tracking
 * Used by Brain to track note access
 */

import { MercuryEvolutionAPI } from './evolution-api.js';

const validActions = ['create', 'read', 'update', 'delete', 'list'] as const;
type Action = typeof validActions[number];

const api = new MercuryEvolutionAPI();

async function track() {
  const [,, action, path] = process.argv;
  
  if (!action || !path) {
    console.error('Usage: mercury-track <action> <path>');
    process.exit(1);
  }
  
  try {
    await api.trackBrainNoteAccess(action as Action, path);
    console.log(JSON.stringify({ success: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exit(1);
  }
}

track().catch(console.error);
