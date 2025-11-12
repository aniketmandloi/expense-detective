import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
	req: NextRequest,
	{ params }: { params: { path: string[] } },
) {
	try {
		const filePath = join(process.cwd(), "uploads", ...params.path);

		// Security: Ensure the path is within uploads directory
		if (!filePath.startsWith(join(process.cwd(), "uploads"))) {
			return NextResponse.json({ error: "Invalid path" }, { status: 400 });
		}

		if (!existsSync(filePath)) {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		const fileBuffer = await readFile(filePath);
		const fileExtension = params.path[params.path.length - 1]?.split(".").pop();

		// Determine content type
		const contentType =
			fileExtension === "pdf"
				? "application/pdf"
				: fileExtension === "png"
					? "image/png"
					: fileExtension === "webp"
						? "image/webp"
						: "image/jpeg";

		return new NextResponse(fileBuffer, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch (error) {
		console.error("File serve error:", error);
		return NextResponse.json(
			{ error: "Failed to serve file" },
			{ status: 500 },
		);
	}
}

