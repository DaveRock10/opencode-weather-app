export interface RunBunOptions {
  cwd?: string;
  stdin?: string;
  env?: Record<string, string | undefined>;
}

export interface RunBunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function buildEnv(overrides: Record<string, string | undefined>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return env;
}

export async function runBun(args: string[], options: RunBunOptions = {}): Promise<RunBunResult> {
  const proc = Bun.spawn({
    cmd: [process.execPath, ...args],
    cwd: options.cwd,
    env: buildEnv(options.env ?? {}),
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (proc.stdin) {
    if (options.stdin !== undefined) proc.stdin.write(options.stdin);
    proc.stdin.end();
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}
