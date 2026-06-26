// Dev-only demo mode. Gated on NODE_ENV so it never ships to production, and the
// app treats the demo token as fully read-only (mutations are blocked, nothing
// touches the backend). Permitted by AGENTS.md for local scenario visualization.
export const isLocalDemoEnabled = process.env.NODE_ENV === "development";
export const demoToken = "driverlogs-demo";
