/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: isProduction ? "/STATIC-THREADS" : "",
  assetPrefix: isProduction ? "/STATIC-THREADS/" : "",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
