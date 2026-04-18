#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const profilePaths = {
  example: ".env.example",
  local: ".env.local",
  development: ".env.development.local",
  "production-local": ".env.production.local",
  "vercel-development": ".env.vercel.development",
  "vercel-production": ".env.vercel.production",
  "vercel-dev": ".env.vercel.development",
  "vercel-prod": ".env.vercel.production",
};

const defaultTargets = ["local", "vercel-development", "vercel-production"];
const allTargets = ["local", "development", "production-local", "vercel-development", "vercel-production"];

const usage = () => {
  console.log(`
Usage:
  node scripts/env-sync.mjs check [--targets local,development,production-local,vercel-development,vercel-production]
  node scripts/env-sync.mjs sync [--targets local,vercel-development,vercel-production]
  node scripts/env-sync.mjs set --key KEY --value VALUE [--profiles local,vercel-development]
  node scripts/env-sync.mjs set --key KEY --value-from-stdin [--profiles local,vercel-development]
  node scripts/env-sync.mjs push [--from local] [--targets vercel-development,vercel-production] [--keys KEY1,KEY2] [--include-empty]

Profiles:
  ${Object.keys(profilePaths).join(", ")}

Notes:
  - check verifies all keys in .env.example exist in target profiles.
  - sync adds missing keys with blank values in target profiles.
  - set updates a key across profiles in one step.
  - push copies values from one profile into target profiles.
  - push skips empty source values by default (use --include-empty to force overwrite with empty values).
  - value-from-stdin avoids leaking secrets in shell history.
`);
};

const fileForProfile = (profile) => {
  const rel = profilePaths[profile];
  if (!rel) {
    throw new Error(
      `Unknown profile '${profile}'. Expected one of: ${Object.keys(profilePaths).join(", ")}`
    );
  }
  return path.join(repoRoot, rel);
};

const ensureFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    return;
  }
  fs.writeFileSync(filePath, "", "utf8");
};

const readLines = (filePath) => {
  ensureFile(filePath);
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
};

const keyRegex = /^([A-Z0-9_]+)=(.*)$/;

const extractKeys = (lines) => {
  const keys = [];
  const seen = new Set();
  for (const line of lines) {
    const match = line.match(keyRegex);
    if (!match) continue;
    const key = match[1];
    if (seen.has(key)) continue;
    keys.push(key);
    seen.add(key);
  }
  return keys;
};

const extractKeyValues = (lines) => {
  const values = new Map();
  for (const line of lines) {
    const match = line.match(keyRegex);
    if (!match) continue;
    const key = match[1];
    const value = match[2] ?? "";
    if (!values.has(key)) {
      values.set(key, value);
    }
  }
  return values;
};

const upsertKey = (lines, key, value) => {
  const next = [...lines];
  const nextLine = `${key}=${value}`;
  let replaced = false;

  for (let i = 0; i < next.length; i += 1) {
    const match = next[i].match(keyRegex);
    if (!match) continue;
    if (match[1] !== key) continue;
    next[i] = nextLine;
    replaced = true;
    break;
  }

  if (!replaced) {
    if (next.length > 0 && next[next.length - 1] !== "") {
      next.push("");
    }
    next.push(nextLine);
  }

  return {
    lines: next,
    changed: !replaced || lines.join("\n") !== next.join("\n"),
  };
};

const writeLines = (filePath, lines) => {
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
};

const parseCsvArg = (value, fallback) => {
  if (!value) return fallback;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const getArgValue = (args, flag) => {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
};

const runCheck = (args) => {
  const targetsArg = getArgValue(args, "--targets");
  const targets = parseCsvArg(targetsArg, defaultTargets);
  const sourceKeys = extractKeys(readLines(fileForProfile("example")));
  let hasFailure = false;

  for (const target of targets) {
    const targetKeys = new Set(extractKeys(readLines(fileForProfile(target))));
    const missing = sourceKeys.filter((key) => !targetKeys.has(key));
    if (missing.length === 0) {
      console.log(`OK ${target}: all keys present`);
      continue;
    }

    hasFailure = true;
    console.log(`MISSING ${target}: ${missing.join(", ")}`);
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
};

const runSync = (args) => {
  const targetsArg = getArgValue(args, "--targets");
  const targets = parseCsvArg(targetsArg, defaultTargets);
  const sourceKeys = extractKeys(readLines(fileForProfile("example")));

  for (const target of targets) {
    const filePath = fileForProfile(target);
    let lines = readLines(filePath);
    let changedCount = 0;

    for (const key of sourceKeys) {
      const hasKey = lines.some((line) => {
        const match = line.match(keyRegex);
        return match?.[1] === key;
      });
      if (hasKey) continue;
      const result = upsertKey(lines, key, "");
      lines = result.lines;
      changedCount += 1;
    }

    if (changedCount > 0) {
      writeLines(filePath, lines);
      console.log(`UPDATED ${target}: added ${changedCount} missing keys`);
    } else {
      console.log(`OK ${target}: no missing keys`);
    }
  }
};

const runSet = (args) => {
  const key = getArgValue(args, "--key");
  if (!key || !/^[A-Z0-9_]+$/.test(key)) {
    throw new Error("set requires --key with uppercase env var format (e.g. MY_VAR)");
  }

  const valueArg = getArgValue(args, "--value");
  const useStdin = args.includes("--value-from-stdin");
  if (!valueArg && !useStdin) {
    throw new Error("set requires --value or --value-from-stdin");
  }

  const value = useStdin ? fs.readFileSync(0, "utf8").trimEnd() : valueArg;
  const profilesArg = getArgValue(args, "--profiles");
  const profiles = parseCsvArg(profilesArg, defaultTargets);

  for (const profile of profiles) {
    const filePath = fileForProfile(profile);
    const lines = readLines(filePath);
    const { lines: updated } = upsertKey(lines, key, value);
    writeLines(filePath, updated);
    console.log(`UPDATED ${profile}: ${key}`);
  }
};

const runPush = (args) => {
  const from = getArgValue(args, "--from") ?? "local";
  const targetsArg = getArgValue(args, "--targets");
  const keysArg = getArgValue(args, "--keys");
  const includeEmpty = args.includes("--include-empty");

  const targets = parseCsvArg(targetsArg, ["vercel-development", "vercel-production"]);
  const keyList = parseCsvArg(keysArg, extractKeys(readLines(fileForProfile("example"))));

  const sourceLines = readLines(fileForProfile(from));
  const sourceValues = extractKeyValues(sourceLines);

  for (const target of targets) {
    if (target === from) {
      console.log(`SKIP ${target}: target is the same as source`);
      continue;
    }

    const filePath = fileForProfile(target);
    let lines = readLines(filePath);
    let updatedCount = 0;
    let skippedEmptyCount = 0;
    let missingSourceCount = 0;

    for (const key of keyList) {
      if (!/^[A-Z0-9_]+$/.test(key)) {
        throw new Error(`Invalid env var key '${key}'. Expected uppercase env var format.`);
      }

      if (!sourceValues.has(key)) {
        missingSourceCount += 1;
        continue;
      }

      const value = sourceValues.get(key) ?? "";
      if (!includeEmpty && value === "") {
        skippedEmptyCount += 1;
        continue;
      }

      const result = upsertKey(lines, key, value);
      lines = result.lines;
      if (result.changed) {
        updatedCount += 1;
      }
    }

    if (updatedCount > 0) {
      writeLines(filePath, lines);
    }

    console.log(
      `PUSHED ${target}: updated=${updatedCount}, skipped-empty=${skippedEmptyCount}, missing-in-source=${missingSourceCount}`
    );
  }
};

const main = () => {
  const [, , command, ...args] = process.argv;
  if (!command || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "check") {
    runCheck(args);
    return;
  }

  if (command === "sync") {
    runSync(args);
    return;
  }

  if (command === "set") {
    runSet(args);
    return;
  }

  if (command === "push") {
    runPush(args);
    return;
  }

  throw new Error(`Unknown command '${command}'`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exitCode = 1;
}
