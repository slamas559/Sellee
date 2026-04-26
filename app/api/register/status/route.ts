import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallengeStatus } from "@/lib/phone-verification";

const querySchema = z.object({
  challenge_id: z.string().uuid(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    challenge_id: searchParams.get("challenge_id"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid challenge id." }, { status: 400 });
  }

  try {
    const status = await getChallengeStatus({
      challengeId: parsed.data.challenge_id,
    });
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load challenge status." },
      { status: 400 },
    );
  }
}

