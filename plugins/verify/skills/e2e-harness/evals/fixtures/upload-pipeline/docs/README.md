# Uploads API

A small ingestion service. Clients submit an upload; the service stores the
payload in blob storage and announces it on a Kafka topic so downstream
consumers can react.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | HTTP listen port |
| `KAFKA_BROKER` | `localhost:9092` | Kafka bootstrap server |
| `UPLOADS_TOPIC` | `uploads` | Topic the service publishes to |
| `AZURE_BLOB_ENDPOINT` | `http://127.0.0.1:10000/devstoreaccount1` | Blob endpoint |
| `BLOB_CONTAINER` | `uploads` | Container receiving stored uploads |

## Check service health

`GET /health` returns `200` with `{"status":"ok"}` once the service has
connected to Kafka and blob storage.

```bash
curl http://localhost:8080/health
```

## Submit an upload

`POST /uploads` accepts a JSON body with a `filename`. The response is
**`202 Accepted`** with a generated `id` — the work has not happened yet.

```bash
curl -X POST http://localhost:8080/uploads \
  -H 'content-type: application/json' \
  -d '{"filename":"report.csv"}'
```

Processing is asynchronous. Two observable effects follow, in order:

1. A blob named `<id>.json` appears in the `uploads` container.
2. A message is published to the `uploads` topic with
   `{"id": "...", "event": "upload.stored", "filename": "..."}`.

## Retrieve upload status

`GET /uploads/{id}` returns `404` while the upload is still pending and `200`
with `{"status":"stored"}` once processing has completed. Poll this endpoint
rather than sleeping — the delay is not fixed.

```bash
curl http://localhost:8080/uploads/6f1c2f0e-1111-2222-3333-444455556666
```
