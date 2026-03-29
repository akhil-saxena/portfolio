/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-2d90aedeebcf4142afe524930c3b6471.r2.dev",
      },
    ],
  },
};

module.exports = nextConfig;
