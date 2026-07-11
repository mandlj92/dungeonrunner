'use strict';

function escapeAnnotation(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function report(error) {
  const message = error?.stack || error?.message || String(error);
  console.error(`::error title=Ashvault runtime smoke test::${escapeAnnotation(message)}`);
  process.exitCode = 1;
}

process.on('uncaughtException', report);
process.on('unhandledRejection', report);
