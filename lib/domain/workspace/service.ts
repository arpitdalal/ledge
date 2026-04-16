import { prisma } from "@/lib/db/client";

export async function getWorkspace() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
    take: 2
  });
  if (workspaces.length === 0) {
    throw new Error("Workspace not found. Run npm run setup to create demo data.");
  }
  if (workspaces.length > 1) {
    throw new Error(
      "Ambiguous workspace context. Expected exactly one workspace. Run npm run setup to reset demo data."
    );
  }

  return workspaces[0];
}
