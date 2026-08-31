import { NextResponse } from "next/server";
import { listOpenAiModels } from "@nomos/ai/server";

export async function GET() {
  const result = await listOpenAiModels();
  return NextResponse.json(result, { status: result.live ? 200 : 503 });
}
