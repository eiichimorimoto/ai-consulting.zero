#!/usr/bin/env node

/**
 * 開発サーバー起動時に自動でブラウザを開くラッパースクリプト。
 * Next.jsの準備完了ログを検出したら一度だけブラウザを起動する。
 */
const { spawn } = require('child_process');

const nextBin = require.resolve('next/dist/bin/next');
const port = process.env.PORT || '3000';
const fallbackUrl = `http://localhost:${port}`;

let detectedLocalUrl = null;

let browserOpened = false;

const nextProcess = spawn(process.execPath, [nextBin, 'dev'], {
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

const extractLocalUrl = (text) => {
  // Next.jsのログ例:
  // - Local:         http://localhost:3000
  const match = text.match(/- Local:\s+(https?:\/\/\S+)/i);
  return match?.[1] ?? null;
};

const getUrlToOpen = () => {
  return process.env.DEV_SERVER_URL || detectedLocalUrl || fallbackUrl;
};

const maybeOpenBrowser = (chunk) => {
  if (browserOpened) return;
  const text = chunk.toString();
  const localUrl = extractLocalUrl(text);
  if (localUrl) detectedLocalUrl = localUrl;
  if (/Ready in/i.test(text) || /started server/i.test(text)) {
    browserOpened = true;
    const urlToOpen = getUrlToOpen();
    const opener = process.platform === 'win32'
      ? spawn('cmd', ['/c', 'start', '', urlToOpen], { stdio: 'ignore', detached: true })
      : process.platform === 'darwin'
        ? spawn('open', [urlToOpen], { stdio: 'ignore', detached: true })
        : spawn('xdg-open', [urlToOpen], { stdio: 'ignore', detached: true });
    opener.unref();
    process.stdout.write(`\n自動でブラウザを起動しました: ${urlToOpen}\n\n`);
  }
};

nextProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
  maybeOpenBrowser(data);
});

nextProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
  maybeOpenBrowser(data);
});

const handleSignal = (signal) => {
  nextProcess.kill(signal);
  process.exit();
};

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

nextProcess.on('exit', (code) => {
  process.exit(code);
});

