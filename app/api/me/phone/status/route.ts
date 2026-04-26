import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getChallengeStatus } from "@/lib/phone-verification";

const querySchema = z.object({
  challenge_id: z.string().uuid(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      userId: session.user.id,
    });
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load challenge status." },
      { status: 400 },
    );
  }
}

