const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const port = 4322;
const localDomain = 'local-admin.eunminlog.site';

const keyFile = path.join(__dirname, '..', 'local-key.pem');
const certFile = path.join(__dirname, '..', 'local.pem');

if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
  console.log('');
  console.log('  인증서 파일이 없습니다!');
  console.log('  다음 명령어를 실행해주세요: pnpm setup');
  console.log('');
  process.exit(1);
}

const app = next({ dev: true, hostname: localDomain, port });
const handle = app.getRequestHandler();

console.log('');
console.log('  로컬 HTTPS 서버 시작중...');

app.prepare().then(() => {
  const server = createServer(
    { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) },
    (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    },
  );

  server.on('upgrade', (req, socket, head) => {
    handle(req, socket, head);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log('  로컬 서버가 시작되었습니다!');
    console.log('');
    console.log(`  https://${localDomain}:${port}`);
    console.log('');
  });
});
