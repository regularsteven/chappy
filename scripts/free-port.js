const { spawnSync } = require('node:child_process');

const rawPort = process.argv[2];
const parsedPort = Number.parseInt(rawPort, 10);

if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  process.exit(0);
}

const resolveListeningPids = (port) => {
  const lookup = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
    encoding: 'utf8',
    timeout: 4000,
  });

  if (lookup.error || lookup.status !== 0 || !lookup.stdout) {
    return [];
  }

  return Array.from(
    new Set(
      lookup.stdout
        .split(/\s+/)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0 && value !== process.pid)
    )
  );
};

const terminatePids = (pids, signal) => {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch (_error) {
      // Ignore processes that no longer exist or cannot be signaled.
    }
  }
};

const listeningPids = resolveListeningPids(parsedPort);
if (!listeningPids.length) {
  process.exit(0);
}

terminatePids(listeningPids, 'SIGTERM');
setTimeout(() => {
  const stillListening = resolveListeningPids(parsedPort);
  if (stillListening.length) {
    terminatePids(stillListening, 'SIGKILL');
  }
  process.exit(0);
}, 300);
