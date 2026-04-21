// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import rehypeMermaid from 'rehype-mermaid';

export default defineConfig({
    markdown: {
        syntaxHighlight: {
            excludeLangs: ['mermaid'],
        },
        rehypePlugins: [
            [
                rehypeMermaid,
                {
					strategy: 'img-svg',
					dark: true,
					browserConfig: {
						waitUntil: 'networkidle',
						// Lowering the viewport width makes the "native" size of the diagram 
						// closer to your blog width, making text look larger.
						viewport: { width: 1000, height: 800 }, 
					},
					mermaidConfig: {
						fontFamily: 'sans-serif',
						themeVariables: {
							fontSize: '24px',       // Increased base font size
							nodePadding: '15', 
							labelPadding: '15',
						},
						flowchart: {
							htmlLabels: true,
							useMaxWidth: false,
							padding: 30,           // Reduced from 60 to bring elements closer
							diagramPadding: 20, 
						},
					},
				}
            ]
        ],
    },

    site: 'https://example.com',
    integrations: [mdx(), sitemap()],
    fonts: [
        {
            provider: fontProviders.local(),
            name: 'Atkinson',
            cssVariable: '--font-atkinson',
            fallbacks: ['sans-serif'],
            options: {
                variants: [
                    {
                        src: ['./src/assets/fonts/atkinson-regular.woff'],
                        weight: 400,
                        style: 'normal',
                        display: 'swap',
                    },
                    {
                        src: ['./src/assets/fonts/atkinson-bold.woff'],
                        weight: 700,
                        style: 'normal',
                        display: 'swap',
                    },
                ],
            },
        },
    ],
});