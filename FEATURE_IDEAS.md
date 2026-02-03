# Feature ideas (high ROI patterns)

This file is a product inspiration dump for **NikaMolt** (task-first governance UI for agents).

## Borrowed patterns (with references)

### 1) Trace / Run viewer (tree + waterfall)
- **Tree of nested steps** (runs/spans): collapsible, with inputs/outputs, tool args, errors, latency.
- **Waterfall timeline** to see long poles + concurrency.
- References:
  - LangSmith: “runs/traces/threads” + deep agent debugging
    - https://blog.langchain.com/debugging-deep-agents-with-langsmith/
  - Sentry: trace view waterfall UX (zoom/search/highlight/share)
    - https://docs.sentry.io/concepts/key-terms/tracing/trace-view/

### 2) Saved Views (fast filters)
- Temporal Web UI “Saved Views” pattern: operator-defined query presets.
- Store locally (v1: localStorage), share via URL query string.
- Reference:
  - https://docs.temporal.io/web-ui

### 3) Human-in-the-loop queues (annotation / approval)
- Build a **Review Queue**: one item at a time, rubric, approve/reject, comments.
- Optional: pairwise compare (A/B) for “which output is better”.
- Reference:
  - LangSmith Annotation Queues: https://docs.langchain.com/langsmith/annotation-queues
  - LangSmith eval concepts: https://docs.langchain.com/langsmith/evaluation-concepts

### 4) Replay / time travel (even limited)
- Store enough information to replay a run (at least at the tool-call layer).
- Compare output diffs + cost/time deltas.
- Reference:
  - AgentOps positioning: https://www.agentops.ai/

### 5) Cost + latency as first-class columns
- Make cost regressions visible everywhere.
- Reference:
  - Langfuse docs emphasize cost + latency: https://langfuse.com/docs

## Voice component (pragmatic v1)

### Voice should be treated as a state machine
- Idle → Listening → Thinking → Speaking → Idle
- Transcript is the “source of truth”; audio is an attachment.

### Minimal v1 UX
- Push-to-talk button
- Live transcript with turn markers
- Barge-in (stop speaking) button

### Minimal v1 backend
- WebSocket endpoint for streaming audio chunks
- Persist utterances:
  - `{ sessionId, speaker, ts0, ts1, text, audioPath? }`

## What to build next (order)
1) Task tree details are already in place → polish + add per-task artifacts/notes UI rendering
2) Add Review Queue (human-needed becomes a queue)
3) Add Trace Viewer (tree + waterfall) fed by events/spans from the agent
4) Add Instances view (connect multiple moltbot instances)
5) Add Voice (push-to-talk) integrated as a “thread” that generates traces
