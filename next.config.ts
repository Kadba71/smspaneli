import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	experimental: {
		optimizePackageImports: ['lucide-react'],
	},
	webpack: (config, { dev }) => {
		if (dev) {
			config.cache = false
		}

		return config
	},
}

export default nextConfig
