import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	// Serve uploaded files
	async rewrites() {
		return [
			{
				source: "/uploads/:path*",
				destination: "/api/uploads/:path*",
			},
		];
	},
};

export default nextConfig;
