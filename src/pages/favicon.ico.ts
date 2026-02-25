import type { APIRoute } from 'astro';

export const GET: APIRoute = () => Response.redirect('/favicon.svg', 308);
