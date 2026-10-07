export type ChangeKind =
  | "content-add"
  | "content-update"
  | "content-delete"
  | "content-withdrawal"
  | "slug-change"
  | "category-move"
  | "large-diff"
  | "dependency-change"
  | "workflow-change"
  | "visual-change"
  | "rollback";

export type ReleaseStatus = "blocked" | "manual" | "auto";

export interface ReleasePolicyInput {
  changeKinds: ChangeKind[];
  taskCategory?: string;
  authorizedTaskCategories: string[];
  validationPassed: boolean;
  blockers: string[];
  warnings: string[];
}

export interface ReleaseDecision {
  status: ReleaseStatus;
  reasons: string[];
}

const autoAuthorizable = new Set<ChangeKind>(["content-add", "content-update"]);
const foreverManual = new Set<ChangeKind>([
  "content-delete",
  "content-withdrawal",
  "slug-change",
  "category-move",
  "large-diff",
  "dependency-change",
  "workflow-change",
  "visual-change",
  "rollback",
]);

export function classifyRelease(input: ReleasePolicyInput): ReleaseDecision {
  const reasons: string[] = [];

  if (!input.validationPassed) reasons.push("Required validation did not pass.");
  if (input.blockers.length) reasons.push(`Blocking findings: ${input.blockers.join(", ")}.`);
  if (reasons.length) return { status: "blocked", reasons };

  const manualKinds = input.changeKinds.filter((kind) => foreverManual.has(kind));
  if (manualKinds.length) reasons.push(`Forever-manual changes: ${manualKinds.join(", ")}.`);
  if (input.warnings.length) reasons.push(`Warnings require confirmation: ${input.warnings.join(", ")}.`);
  if (reasons.length) return { status: "manual", reasons };

  const onlyLowRisk = input.changeKinds.length > 0 && input.changeKinds.every((kind) => autoAuthorizable.has(kind));
  const exactAuthorization = Boolean(
    input.taskCategory && input.authorizedTaskCategories.includes(input.taskCategory),
  );

  if (onlyLowRisk && exactAuthorization) {
    return {
      status: "auto",
      reasons: [`Exact low-risk task category authorized: ${input.taskCategory}.`],
    };
  }

  if (!input.changeKinds.length) reasons.push("No deployable change was identified.");
  if (!onlyLowRisk) reasons.push("The change set is not entirely low risk.");
  if (!exactAuthorization) reasons.push("No exact automatic-deployment authorization exists for this task category.");
  return { status: "manual", reasons };
}
