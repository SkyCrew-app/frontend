/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Résoudre les problèmes liés à l'utilisation de modules CommonJS
    config.resolve.fallback = { fs: false };
    return config;
  },
};

export default nextConfig;
