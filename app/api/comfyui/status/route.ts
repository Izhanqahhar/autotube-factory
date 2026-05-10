import { NextResponse } from "next/server";
import { getComfyUIStatus } from "@/lib/image-generators/comfyui";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getComfyUIStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { running: false, models: [], queue: 0, error: String(err) },
      { status: 200 } // always 200 so UI can display the error
    );
  }
}
