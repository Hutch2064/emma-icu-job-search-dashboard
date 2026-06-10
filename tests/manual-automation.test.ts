import { describe, expect, it } from "vitest";
import { automationRunCommand } from "@/lib/manual-automation";

describe("manual Codex automation runner", () => {
  it("runs the Emma automation script from this dashboard workspace", () => {
    const command = automationRunCommand();

    expect(command.command).toBe("/Users/aidanhutchison/.local/bin/emma-job-codex-run");
    expect(command.args).toEqual([]);
    expect(command.options.cwd).toBeUndefined();
    expect(command.options.detached).toBe(true);
    expect(command.options.stdio).toBe("ignore");
  });
});
