/// <reference path="../.astro/types.d.ts" />
/// <reference types="@astrojs/vercel" />

const env: {
  PUBLIC_PHIM_MOI: string;
  NODE_ENV: 'development' | 'production';
};

// Vercel Edge Middleware types
declare namespace App {
  interface Locals {
    vercel?: {
      edge?: {
        geo?: string;
        ip?: string;
        city?: string;
        region?: string;
      };
    };
  }
}
