/// <reference types="vite/client" />
import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import appCss from '../styles/globals.css?url'

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'Guppy',
            },
            {
                name: 'description',
                content: 'Quantum-first programming language, embedded in Python.',
            },
        ],
        links: [
            { rel: 'stylesheet', href: appCss },
            {
                rel: 'preconnect',
                href: 'https://fonts.gstatic.com',
                crossOrigin: 'anonymous',
            },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            {
                rel: 'stylesheet',
                href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap',
            },
            {
                rel: 'stylesheet',
                href: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/github.min.css',
            },
            { rel: 'icon', type: 'image/svg+xml', href: '/quantinuum_favicon.svg' },
        ],
        scripts: [
            {
                src: 'https://www.googletagmanager.com/gtag/js?id=G-YPQ1FTGDL3',
                async: true,
            },
            {
                children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-YPQ1FTGDL3');`,
            },
        ],
    }),
    component: RootComponent,
})

function RootComponent() {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body className="font-sans text-base overflow-x-hidden antialiased">
                {children}
                <Scripts />
            </body>
        </html>
    )
}
