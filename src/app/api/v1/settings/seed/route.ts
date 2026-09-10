import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import {
  seedAttendanceStatuses,
  seedCaseClassifications,
  seedCaseStatuses,
  seedEventCategories,
  seedRecruitmentStages,
  seedSettingsCatalog,
} from "@/services/settings-seed-service";
import { canManageSettings } from "@/lib/rbac";
import {
  ATTENDANCE_STATUS_CATEGORY,
  CASE_CLASSIFICATION_CATEGORY,
  CASE_STATUS_CATEGORY,
  EVENT_CATEGORY_CATEGORY,
  RECRUITMENT_STAGE_CATEGORY,
} from "@/types/settings";
import type { SettingKind } from "@/types/settings";
import { checkApiRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import {
  isAttendanceStatusSeedingEnabled,
  isCaseClassificationSeedingEnabled,
  isCaseStatusSeedingEnabled,
  isEventCategorySeedingEnabled,
  isRecruitmentStageSeedingEnabled,
  isSeedingEnabled,
} from "@/lib/seed-flags";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const session = await getServerSession(authOptions);
  const identifier = getClientIdentifier(request, session?.user?.id);
  const rate = await checkApiRateLimit(identifier);
  const headers = {
    "X-Request-Id": requestId,
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
  };
  if (!rate.success)
    return NextResponse.json(
      { error: "RATE_LIMITED", requestId },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(
            Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000)),
          ),
        },
      },
    );
  if (!session?.user?.role)
    return NextResponse.json(
      { error: "UNAUTHENTICATED", requestId },
      { status: 401, headers },
    );
  if (!canManageSettings(session.user.role))
    return NextResponse.json(
      { error: "FORBIDDEN", requestId },
      { status: 403, headers },
    );
  const body = (await request.json().catch(() => ({}))) as {
    kind?: SettingKind;
    category?: string;
  };
  const kind = body.kind;
  if (!kind || !["position", "project", "status"].includes(kind))
    return NextResponse.json(
      { error: "VALIDATION_ERROR", requestId },
      { status: 400, headers },
    );

  const isAttendance = kind === "status" && body.category === ATTENDANCE_STATUS_CATEGORY;
  if (isAttendance) {
    if (!isAttendanceStatusSeedingEnabled())
      return NextResponse.json(
        { error: "SEEDING_DISABLED", requestId },
        { status: 403, headers },
      );
    await connectMongoDB();
    const result = await seedAttendanceStatuses();
    return NextResponse.json(
      { inserted: result.upsertedCount, kind, category: body.category, requestId },
      { headers },
    );
  }

  const isRecruitmentStage = kind === "status" && body.category === RECRUITMENT_STAGE_CATEGORY;
  if (isRecruitmentStage) {
    if (!isRecruitmentStageSeedingEnabled())
      return NextResponse.json(
        { error: "SEEDING_DISABLED", requestId },
        { status: 403, headers },
      );
    await connectMongoDB();
    const result = await seedRecruitmentStages();
    return NextResponse.json(
      { inserted: result.upsertedCount, kind, category: body.category, requestId },
      { headers },
    );
  }

  const isEventCategory = kind === "status" && body.category === EVENT_CATEGORY_CATEGORY;
  if (isEventCategory) {
    if (!isEventCategorySeedingEnabled())
      return NextResponse.json(
        { error: "SEEDING_DISABLED", requestId },
        { status: 403, headers },
      );
    await connectMongoDB();
    const result = await seedEventCategories();
    return NextResponse.json(
      { inserted: result.upsertedCount, kind, category: body.category, requestId },
      { headers },
    );
  }

  const isCaseClassification = kind === "status" && body.category === CASE_CLASSIFICATION_CATEGORY;
  if (isCaseClassification) {
    if (!isCaseClassificationSeedingEnabled())
      return NextResponse.json(
        { error: "SEEDING_DISABLED", requestId },
        { status: 403, headers },
      );
    await connectMongoDB();
    const result = await seedCaseClassifications();
    return NextResponse.json(
      { inserted: result.upsertedCount, kind, category: body.category, requestId },
      { headers },
    );
  }

  const isCaseStatus = kind === "status" && body.category === CASE_STATUS_CATEGORY;
  if (isCaseStatus) {
    if (!isCaseStatusSeedingEnabled())
      return NextResponse.json(
        { error: "SEEDING_DISABLED", requestId },
        { status: 403, headers },
      );
    await connectMongoDB();
    const result = await seedCaseStatuses();
    return NextResponse.json(
      { inserted: result.upsertedCount, kind, category: body.category, requestId },
      { headers },
    );
  }

  if (!isSeedingEnabled(kind))
    return NextResponse.json(
      { error: "SEEDING_DISABLED", requestId },
      { status: 403, headers },
    );
  await connectMongoDB();
  const result = await seedSettingsCatalog([kind]);
  return NextResponse.json(
    { inserted: result.upsertedCount, kind, requestId },
    { headers },
  );
}
