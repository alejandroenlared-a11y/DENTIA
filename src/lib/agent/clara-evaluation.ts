import { initialDentalAgentState, runDentalSeniorTurn, type DentalAgentState } from "@/lib/agent/dental-senior-agent";

export type ClaraCriterion =
  | { type: "replyIncludes"; value: string; weight?: number; critical?: boolean }
  | { type: "replyExcludes"; value: string; weight?: number; critical?: boolean }
  | { type: "transcriptIncludes"; value: string; weight?: number; critical?: boolean }
  | { type: "transcriptExcludes"; value: string; weight?: number; critical?: boolean }
  | { type: "stateEquals"; field: keyof DentalAgentState; value: unknown; weight?: number; critical?: boolean }
  | { type: "stateTruthy"; field: keyof DentalAgentState; weight?: number; critical?: boolean }
  | { type: "stateFalsy"; field: keyof DentalAgentState; weight?: number; critical?: boolean }
  | { type: "availabilityIncludes"; value: string; weight?: number; critical?: boolean };

export type ClaraConversationFixture = {
  id: string;
  category: string;
  title: string;
  messages: string[];
  criteria: ClaraCriterion[];
};

export type ClaraTurnLog = {
  patient: string;
  clara: string;
};

export type ClaraConversationResult = {
  id: string;
  category: string;
  title: string;
  score: number;
  earned: number;
  total: number;
  turns: ClaraTurnLog[];
  finalState: DentalAgentState;
  failed: Array<{ criterion: ClaraCriterion; evidence: string }>;
  criticalFailed: Array<{ criterion: ClaraCriterion; evidence: string }>;
};

export type ClaraEvaluationResult = {
  score: number;
  earned: number;
  total: number;
  criticalFailures: number;
  conversations: ClaraConversationResult[];
};

// Permite conducir el mismo banco de fixtures y el mismo criterio de
// puntuacion contra un motor distinto al local determinista (p.ej. el LLM
// real via runDentalAgentTurn). historySoFar es el estado previo de la
// conversacion (sin el turno actual), igual que arma index.ts en produccion.
export type ClaraTurnResult = { reply: string; state: DentalAgentState };
export type ClaraTurnRunner = (
  state: DentalAgentState,
  message: string,
  historySoFar: ClaraTurnLog[]
) => Promise<ClaraTurnResult>;

export function evaluateClaraConversations(fixtures: ClaraConversationFixture[]): ClaraEvaluationResult {
  const conversations = fixtures.map(evaluateClaraConversation);
  return aggregateResults(conversations);
}

export function evaluateClaraConversation(fixture: ClaraConversationFixture): ClaraConversationResult {
  let state: DentalAgentState = initialDentalAgentState;
  const turns: ClaraTurnLog[] = [];

  for (const message of fixture.messages) {
    const turn = runDentalSeniorTurn(state, message);
    state = turn.state;
    turns.push({ patient: message, clara: turn.reply });
  }

  return scoreConversation(fixture, turns, state);
}

export async function evaluateClaraConversationsWithRunner(
  fixtures: ClaraConversationFixture[],
  runTurn: ClaraTurnRunner
): Promise<ClaraEvaluationResult> {
  const conversations: ClaraConversationResult[] = [];
  for (const fixture of fixtures) {
    conversations.push(await evaluateClaraConversationWithRunner(fixture, runTurn));
  }
  return aggregateResults(conversations);
}

export async function evaluateClaraConversationWithRunner(
  fixture: ClaraConversationFixture,
  runTurn: ClaraTurnRunner
): Promise<ClaraConversationResult> {
  let state: DentalAgentState = initialDentalAgentState;
  const turns: ClaraTurnLog[] = [];

  for (const message of fixture.messages) {
    const turn = await runTurn(state, message, turns);
    state = turn.state;
    turns.push({ patient: message, clara: turn.reply });
  }

  return scoreConversation(fixture, turns, state);
}

function aggregateResults(conversations: ClaraConversationResult[]): ClaraEvaluationResult {
  const earned = conversations.reduce((sum, conversation) => sum + conversation.earned, 0);
  const total = conversations.reduce((sum, conversation) => sum + conversation.total, 0);

  return {
    score: total > 0 ? Math.round((earned / total) * 100) : 0,
    earned,
    total,
    criticalFailures: conversations.reduce((sum, conversation) => sum + conversation.criticalFailed.length, 0),
    conversations
  };
}

function scoreConversation(
  fixture: ClaraConversationFixture,
  turns: ClaraTurnLog[],
  state: DentalAgentState
): ClaraConversationResult {
  const finalReply = turns.at(-1)?.clara ?? "";
  const transcript = turns.map(turn => `${turn.patient}\n${turn.clara}`).join("\n");
  const failed: ClaraConversationResult["failed"] = [];
  const criticalFailed: ClaraConversationResult["criticalFailed"] = [];
  let earned = 0;
  let total = 0;

  for (const criterion of fixture.criteria) {
    const weight = criterion.weight ?? 1;
    total += weight;
    const passed = evaluateCriterion(criterion, finalReply, transcript, state);
    if (passed) {
      earned += weight;
    } else {
      const failure = { criterion, evidence: evidenceForCriterion(criterion, finalReply, transcript, state) };
      failed.push(failure);
      if (criterion.critical) {
        criticalFailed.push(failure);
      }
    }
  }

  return {
    id: fixture.id,
    category: fixture.category,
    title: fixture.title,
    score: total > 0 ? Math.round((earned / total) * 100) : 0,
    earned,
    total,
    turns,
    finalState: state,
    failed,
    criticalFailed
  };
}

function evaluateCriterion(criterion: ClaraCriterion, reply: string, transcript: string, state: DentalAgentState) {
  switch (criterion.type) {
    case "replyIncludes":
      return normalize(reply).includes(normalize(criterion.value));
    case "replyExcludes":
      return !normalize(reply).includes(normalize(criterion.value));
    case "transcriptIncludes":
      return normalize(transcript).includes(normalize(criterion.value));
    case "transcriptExcludes":
      return !normalize(transcript).includes(normalize(criterion.value));
    case "stateEquals":
      return state[criterion.field] === criterion.value;
    case "stateTruthy":
      return Boolean(state[criterion.field]);
    case "stateFalsy":
      return !state[criterion.field];
    case "availabilityIncludes":
      return normalize(state.availability).includes(normalize(criterion.value));
  }
}

function evidenceForCriterion(criterion: ClaraCriterion, reply: string, transcript: string, state: DentalAgentState) {
  if (criterion.type === "stateEquals" || criterion.type === "stateTruthy" || criterion.type === "stateFalsy") {
    return JSON.stringify({ field: criterion.field, actual: state[criterion.field] });
  }
  if (criterion.type === "availabilityIncludes") {
    return JSON.stringify({ availability: state.availability });
  }
  if (criterion.type === "transcriptIncludes" || criterion.type === "transcriptExcludes") {
    return transcript;
  }
  return reply;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
