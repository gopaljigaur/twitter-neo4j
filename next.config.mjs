/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // For Docker deployment
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
    ],
  },
  // Use webpack instead of Turbopack (Turbopack doesn't support all our webpack customizations yet)
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize onnxruntime-node to avoid webpack bundling issues
      config.externals.push('onnxruntime-node', 'sharp', 'canvas');
    }

    // Ignore ONNX model files
    config.module.rules.push({
      test: /\.(onnx|wasm)$/,
      type: 'asset/resource',
    });

    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
