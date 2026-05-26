// Custom reporter: reads latency samples emitted by support/api.ts as test
// attachments, aggregates p95 per urlPattern, prints a table at the end of
// the run, and fails the suite if any pattern exceeds the configured threshold.
//
// Wired in playwright.config.ts via:
//   ["./support/latency-reporter.ts", { thresholdMs: 500 }]
//
// Pass criteria (per plan):
//   100% green + p95 < thresholdMs per endpoint pattern.

import type { Reporter, TestCase, TestResult, FullResult } from "@playwright/test/reporter";
import type { LatencySample } from "./api.js";

interface Options {
  thresholdMs?: number;
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

class LatencyReporter implements Reporter {
  private samples = new Map<string, number[]>();
  private thresholdMs: number;

  constructor(opts: Options = {}) {
    this.thresholdMs = opts.thresholdMs ?? 500;
  }

  onTestEnd(_test: TestCase, result: TestResult): void {
    for (const att of result.attachments) {
      if (!att.name.startsWith("latency.") || !att.body) continue;
      try {
        const sample = JSON.parse(att.body.toString("utf-8")) as LatencySample;
        const arr = this.samples.get(sample.urlPattern) ?? [];
        arr.push(sample.durationMs);
        this.samples.set(sample.urlPattern, arr);
      } catch {
        // Ignore malformed attachments.
      }
    }
  }

  async onEnd(result: FullResult): Promise<{ status?: FullResult["status"] } | undefined> {
    if (this.samples.size === 0) {
      console.log("\n[latency-reporter] no samples collected");
      return;
    }
    const rows = Array.from(this.samples.entries())
      .map(([pattern, vals]) => ({
        pattern,
        n: vals.length,
        p50: p95(vals.slice(0, Math.ceil(vals.length * 0.5))),
        p95: p95(vals),
        max: Math.max(...vals),
      }))
      .sort((a, b) => b.p95 - a.p95);

    const padEnd = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));
    const padStart = (s: string, w: number) => " ".repeat(Math.max(0, w - s.length)) + s;
    const colW = Math.max(8, ...rows.map((r) => r.pattern.length));

    console.log("\n┌─ Latency p95 by endpoint pattern (threshold=" + this.thresholdMs + "ms) ─");
    console.log("│ " + padEnd("endpoint", colW) + "   " + padStart("n", 4) + "  " +
      padStart("p50", 6) + "  " + padStart("p95", 6) + "  " + padStart("max", 6) + "  status");
    let breached = false;
    for (const r of rows) {
      const ok = r.p95 < this.thresholdMs;
      if (!ok) breached = true;
      console.log("│ " + padEnd(r.pattern, colW) + "   " + padStart(String(r.n), 4) + "  " +
        padStart(String(r.p50), 6) + "  " + padStart(String(r.p95), 6) + "  " +
        padStart(String(r.max), 6) + "  " + (ok ? "OK" : "SLOW"));
    }
    console.log("└─");

    if (breached) {
      console.error(`[latency-reporter] FAIL — one or more patterns exceeded p95 < ${this.thresholdMs}ms`);
      if (result.status === "passed") {
        return { status: "failed" };
      }
    } else {
      console.log(`[latency-reporter] OK — all patterns under ${this.thresholdMs}ms p95`);
    }
  }
}

export default LatencyReporter;
