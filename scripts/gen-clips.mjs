// Drive the whole AI-shot batch against paba.tv.
//
// The server is the source of truth: every round pulls the recent job list and matches each
// job back to a shot by its prompt. That makes this script idempotent - it survives a crash,
// a killed run, or a job submitted by hand, and it can never submit the same shot twice
// (a duplicate burns a paid/free quota slot).
//
// Free tier allows at most TWO jobs in flight, so submission is slot-based.
//
//   node scripts/gen-clips.mjs          # run until every shot has a clip
//   DRY=1 node scripts/gen-clips.mjs    # one round, print the plan, submit nothing
//
// Requires work/shots.plan.json (shot id -> duration + reference key) and work/refs.json
// (reference key -> uploaded asset URL). See docs/PIPELINE.md.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { C } from "./config.mjs";
import { requirePabaSession } from "./paba-session.mjs";

const SKILL = process.env.PABA_SKILL;
if (!SKILL || !existsSync(join(SKILL, "scripts/video.mjs"))) {
  console.error("set PABA_SKILL to the generating-video-with-paba-h3 skill directory");
  process.exit(1);
}
requirePabaSession(SKILL);

const refs = JSON.parse(readFileSync(join(C.work, "refs.json"), "utf8"));
const plan = JSON.parse(readFileSync(join(C.work, "shots.plan.json"), "utf8"));
const SHOTS = plan.shots;
mkdirSync(C.clips, { recursive: true });

for (const s of SHOTS) {
  if (!refs[s.ref]) throw new Error(`shot ${s.id} references "${s.ref}" which is not in work/refs.json`);
  const f = join(C.prompts, s.id + ".txt");
  if (!existsSync(f)) throw new Error(`missing prompt file ${f}`);
}

const run = (args) => execFileSync("node", [join(SKILL, "scripts/video.mjs"), ...args],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const parse = (out) => JSON.parse(out.slice(out.indexOf("{")));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const TERMINAL = new Set(["done", "failed", "error", "cancelled"]);
const MAX_IN_FLIGHT = Number(process.env.MAX_IN_FLIGHT || 2);
const DRY = process.env.DRY === "1";

// Match on the WHOLE normalised prompt, never on a prefix. Two shots can easily open with the
// same sentence ("a young man in a long deep-indigo coat..."), and a 60-char key then binds one
// job to two shots and copies the wrong clip over the right filename - silently.
const flat = (p) => String(p ?? "").replace(/\s+/g, " ").trim();
const KEYS = Object.fromEntries(SHOTS.map((s) => [s.id, flat(readFileSync(join(C.prompts, s.id + ".txt"), "utf8"))]));

const present = () => SHOTS.filter((s) => existsSync(join(C.clips, s.id + ".mp4")) && statSync(join(C.clips, s.id + ".mp4")).size > 40000);

for (let round = 0; round < 900; round++) {
  let recent;
  try {
    recent = parse(run(["recent", "40"])).data ?? [];
  } catch (e) {
    log("recent failed", String(e.message).slice(0, 120));
    await new Promise((r) => setTimeout(r, 15000));
    continue;
  }

  const byShot = {};
  for (const job of recent) {
    const p = flat(job.prompt);
    const hits = SHOTS.filter((s) => p === KEYS[s.id]);
    if (hits.length > 1) throw new Error("prompt collision: " + hits.map((h) => h.id).join(","));
    if (hits.length === 1) {
      const prev = byShot[hits[0].id];
      // several jobs can exist for one shot (a retry, a duplicate); keep the newest
      if (!prev || String(job.id) > String(prev.id)) byShot[hits[0].id] = job;
    }
  }

  if (DRY) {
    for (const s of SHOTS) {
      const j = byShot[s.id];
      log(s.id, j ? `${j.id} ${j.status} dur=${j.duration}` : "NOT SUBMITTED");
    }
    break;
  }

  for (const s of SHOTS) {
    const job = byShot[s.id];
    if (!job) continue;
    const dst = join(C.clips, s.id + ".mp4");
    if (job.status === "done" && !(existsSync(dst) && statSync(dst).size > 40000)) {
      try {
        run(["get", job.id, dst]);
        log("downloaded", s.id, statSync(dst).size);
      } catch (e) {
        log("download failed", s.id, String(e.message).slice(0, 140));
      }
    }
  }

  const inFlight = SHOTS.filter((s) => byShot[s.id] && !TERMINAL.has(byShot[s.id].status)).length;
  const missing = SHOTS.filter((s) => !byShot[s.id]);
  const have = present();

  if (have.length === SHOTS.length) { log("ALL CLIPS PRESENT"); break; }

  if (inFlight < MAX_IN_FLIGHT && missing.length) {
    const next = missing[0];
    try {
      const j = parse(run(["submit", join(C.prompts, next.id + ".txt"),
        "--dur", String(next.dur), "--ratio", plan.ratio || "16:9",
        "--res", plan.res || "768p", "--ref", refs[next.ref].url, "--yes"]));
      log("submitted", next.id, j.id, j.status);
    } catch (e) {
      // 429 too_many_pending and 409 duplicate_submission are both expected and must NOT be
      // retried blindly: the next round re-reads the server and sees the real state.
      log("submit blocked", next.id, String(e.message).slice(0, 140));
    }
  }

  log("round", round, "inflight", inFlight,
    "| have:", have.map((s) => s.id).join(",") || "-",
    "| missing:", missing.map((s) => s.id).join(",") || "-");
  await new Promise((r) => setTimeout(r, 20000));
}

log("FINAL", SHOTS.map((s) => s.id + "=" + (existsSync(join(C.clips, s.id + ".mp4")) ? "clip" : "NONE")).join(" "));
