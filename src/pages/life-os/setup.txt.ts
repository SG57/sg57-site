import type { APIRoute } from 'astro';
import { setupPrompt } from '../../lib/lifeos-kit';

/** The short setup message the main copy button copies. Versionless on purpose: it points at PASTE-SETUP.txt. */
export const GET: APIRoute = () =>
  new Response(setupPrompt + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
