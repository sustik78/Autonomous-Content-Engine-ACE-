import { runWorkflow } from "@/lib/ace/orchestrator";
import { WorkflowRunRequest } from "@/lib/ace/types";

export async function POST(request: Request) {
  const body = (await request.json()) as WorkflowRunRequest;
  const workflow = await runWorkflow(body);
  return Response.json(workflow);
}
