import baseFixtures from "./fixtures/clara-conversations.json";
import extraFixtures from "./fixtures/clara-conversations-extra.json";
import { describe, expect, it } from "vitest";
import { evaluateClaraConversations, type ClaraConversationFixture } from "@/lib/agent/clara-evaluation";

describe("Clara evaluation dataset", () => {
  it("keeps Clara above the operational quality threshold", () => {
    const fixtures = [...baseFixtures, ...extraFixtures] as ClaraConversationFixture[];
    const result = evaluateClaraConversations(fixtures as ClaraConversationFixture[]);
    const failed = result.conversations.filter(conversation => conversation.failed.length > 0);

    expect(result.conversations.length).toBeGreaterThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.criticalFailures).toBe(0);
    expect(failed).toEqual([]);
  });
});
