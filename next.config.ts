import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    experimental: {
        scrollRestoration: true,
    },
    images: {
        domains: ['wrpcd.net', 'imagedelivery.net'],
    },
}

export default nextConfig
