// Minimal upload pipeline used as an e2e-harness fixture.
//
// POST /uploads  -> writes a blob, then publishes to the uploads topic
// GET  /uploads/:id -> 404 until the blob write is confirmed, then 200
//
// The write is deliberately asynchronous so the fixture exercises the await_*
// step kinds rather than a plain request/response assertion.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { BlobServiceClient } from '@azure/storage-blob';
import { Kafka } from 'kafkajs';

const PORT = Number(process.env.PORT || 8080);
const TOPIC = process.env.UPLOADS_TOPIC || 'uploads';
const CONTAINER = process.env.BLOB_CONTAINER || 'uploads';
const BLOB_ENDPOINT = process.env.AZURE_BLOB_ENDPOINT || 'http://127.0.0.1:10000/devstoreaccount1';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const CONN =
  'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;' +
  'AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;' +
  `BlobEndpoint=${BLOB_ENDPOINT};`;

const blobs = BlobServiceClient.fromConnectionString(CONN);
const kafka = new Kafka({ clientId: 'uploads-api', brokers: [KAFKA_BROKER], retry: { retries: 20 } });
const producer = kafka.producer();

const done = new Set();

async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      await blobs.getContainerClient(CONTAINER).createIfNotExists();
      await producer.connect();
      return true;
    } catch (err) {
      console.log('waiting for dependencies:', err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
}

function json(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { status: 'ok' });
  }

  if (req.method === 'POST' && url.pathname === '/uploads') {
    let payload = {};
    try { payload = JSON.parse((await readBody(req)) || '{}'); } catch { /* tolerate */ }
    const id = randomUUID();
    json(res, 202, { id, status: 'accepted' });

    // Deliberately after the response: the observable effect is a blob and a
    // message, which is exactly what await_blob / await_message are for.
    setTimeout(async () => {
      try {
        const cc = blobs.getContainerClient(CONTAINER);
        await cc.createIfNotExists();
        const body = JSON.stringify({ id, filename: payload.filename ?? 'unnamed', received: true });
        await cc.getBlockBlobClient(`${id}.json`).upload(body, Buffer.byteLength(body));
        await producer.send({
          topic: TOPIC,
          messages: [{ key: id, value: JSON.stringify({ id, event: 'upload.stored', filename: payload.filename ?? 'unnamed' }) }],
        });
        done.add(id);
        console.log('processed', id);
      } catch (err) {
        console.error('processing failed', err);
      }
    }, 400);
    return;
  }

  const m = url.pathname.match(/^\/uploads\/([0-9a-f-]+)$/);
  if (req.method === 'GET' && m) {
    return done.has(m[1])
      ? json(res, 200, { id: m[1], status: 'stored' })
      : json(res, 404, { id: m[1], status: 'pending' });
  }

  json(res, 404, { error: 'not found' });
});

ready().then((ok) => {
  if (!ok) console.error('dependencies never became ready; serving anyway');
  server.listen(PORT, () => console.log(`uploads-api on :${PORT}`));
});
