import { prisma } from "@/lib/db/client";

export async function getWorkspace() {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (!workspace) {
    throw new Error("Workspace not found. Run npm run setup to create demo data.");
  }

  return workspace;
}
