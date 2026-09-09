/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
const basePath = configuredBasePath ?? (isProduction ? "/STATIC-THREADS" : "");

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
