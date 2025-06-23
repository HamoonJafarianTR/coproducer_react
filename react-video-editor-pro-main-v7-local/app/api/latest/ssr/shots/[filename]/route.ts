import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;

  // Construct the path to the video file
  const videoPath = path.join(process.cwd(), "public", "shots", filename);

  // Check if the file exists
  if (!fs.existsSync(videoPath)) {
    return new NextResponse("Video not found", { status: 404 });
  }

  // Read the file
  const videoBuffer = fs.readFileSync(videoPath);

  // Return the video with appropriate headers
  return new NextResponse(videoBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoBuffer.length.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000",
    },
  });
} 