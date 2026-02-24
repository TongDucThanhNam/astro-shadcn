// @ts-check
import {defineConfig} from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// import node from '@astrojs/node';

// import vtbot from 'astro-vtbot';

// https://astro.build/config
export default defineConfig({
    prefetch: {
        prefetchAll: true,
        defaultStrategy: 'hover'
    },
    integrations: [react(),
        // vtbot(
        //     {
        //         loadingIndicator: true,
        //         autoLint: true,
        //     }
        // ),
    ],
    vite: {
        plugins: [tailwindcss()],
    },
    image: {
        service: {
            entrypoint: './src/lib/image-service/wsrc.ts',
            config: {
                
                baseUrl: 'https://wsrv.nl/?url=',
                imageOrigin: 'https://phimimg.com/',
                defaultQuality: 80,
                defaultFormat: 'webp',
            },
        },
        domains: ['wsrv.nl', 'phimimg.com'],
        responsiveStyles: true,
    },
    output: "server",
    adapter: vercel(
        {
            webAnalytics: {
                enabled: false,
            },
            // Enable edge middleware for better performance
            edgeMiddleware: false,
            // Optimize ISR caching - 10 min for fresh movie data
            isr: {
                // caches all pages on first request, expires after 10 minutes
                expiration: 60 * 10,
            },
            // Enable Vercel Image Optimization API
            imageService: false,
            // Extend function timeout for API calls
            maxDuration: 30,
        }
    ),
});
