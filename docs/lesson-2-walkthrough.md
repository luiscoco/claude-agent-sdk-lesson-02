# Lesson 2 classroom walkthrough

## Outcomes

Students should be able to group the core exports by responsibility, distinguish preparation from querying, explain a typed custom tool and SDK-hosted MCP server, and choose configuration helpers and constants by purpose.

## 1. Read the contract

Open `src/server/course-tool.ts`. Identify the name, description, Zod input shape, and async handler. Predict the output for Lesson 2 with practice included.

**Expected evidence:** a numeric ID from 1–9 is required, `includePractice` is a boolean defaulting to false, and the handler returns an MCP content envelope with structured lesson data.

## 2. Validate before execution

Call the tool with a valid payload, then try a string ID, a missing ID, an out-of-range ID, and a fractional ID. Inspect the discovered schema and handler count.

**Expected evidence:** valid input results in one handler invocation. Invalid arguments are rejected through the real MCP server with zero handler calls. Malformed JSON is a host request problem before any MCP call; it is a different boundary.

## 3. Follow server registration

Read `src/server/invoke.ts` and `src/server/live.ts`.

- Why can the workshop call a real tool without a model account?
- Which export creates the hosted server?
- Which configuration key creates the `mcp__course__lookup_lesson` namespace?
- How does a tool result differ from the final SDK query result?

**Expected evidence:** the local workshop uses an MCP client directly; it does not run `query()`. The optional model path registers the server under `mcpServers.course`. Tool output supplies information that an agent can use before producing its own final result.

## 4. Assign exports to responsibilities

Use the Core exports filters. Explain which API you would choose to start work, prepare a known session, park an unclaimed process, define a capability, expose tools, inspect configuration, or look up a name.

**Expected evidence:** `query` runs, `startup` and alpha `prewarm` prepare with different handle types, `tool` defines, `createSdkMcpServer` hosts, configuration helpers inspect/filter, and constants provide lookup data. Merely creating a server does not run a model.

## 5. Inspect settings deliberately

Read the controlled project fixture and inspect it in the UI. Compare raw and trust-filtered default modes. Explain why the result is not itself a final permission decision and why machine policy may affect the merge.

**Expected evidence:** the student recognizes the project-tier escalation filter. Raw settings and secret environment values are not exposed by the sample. The fixture is not applied to live queries.

## 6. Interpret names without assuming availability

Look up `Read`, `Task`, `mcp__course__lookup_lesson`, and an unknown name.

**Expected evidence:** `Task` is a compatibility alias for `Agent`; the sample's MCP name is separate from the built-in list. Constants are lookup values, not callable functions or proof of a running session's tools.

## 7. Extend one read-only capability

Add an optional field to the tool schema and use it in the handler. Write an MCP-path test for a valid value, an omitted value, and a wrong type. Explain why all three tests matter.

**Expected evidence:** tests exercise the actual protocol boundary, prove validation behavior, and inspect the result envelope rather than calling the handler directly.

Finish the four-question check, then describe the path from tool contract to MCP result in your own words.
