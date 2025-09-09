/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Use eval-source-map for better development performance while maintaining good debugging
      config.devtool = 'eval-source-map'
    } else if (!isServer) {
      // Use source-map for production client-side code
      config.devtool = 'source-map'
    }
    return config
  },
}

export default nextConfig
