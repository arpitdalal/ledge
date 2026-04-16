import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import { getWorkspace } from "@/lib/domain/workspace/service";

describe("workspace service", () => {
  beforeEach(async () => {
    await prisma.recurringOccurrence.deleteMany();
    await prisma.recurringRule.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.category.deleteMany();
    await prisma.workspace.deleteMany();
  });

  it("returns the only workspace", async () => {
    const workspace = await prisma.workspace.create({
      data: { name: "Primary", currency: "CAD", locale: "en-CA" }
    });

    await expect(getWorkspace()).resolves.toMatchObject({ id: workspace.id });
  });

  it("rejects ambiguous multi-workspace state", async () => {
    await prisma.workspace.create({
      data: { name: "First", currency: "CAD", locale: "en-CA" }
    });
    await prisma.workspace.create({
      data: { name: "Second", currency: "USD", locale: "en-US" }
    });

    await expect(getWorkspace()).rejects.toThrow(
      "Ambiguous workspace context. Expected exactly one workspace."
    );
  });
});
