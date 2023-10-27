# Massive Corpus Embeddings

This repo contains a Bun / Nodejs implementation for embedding large text corpuses at scale with the Replicate API using the CCR COG embedding template. It sends the replicate endpoint a large list of URLs from which it may download multiple files of chunked text data and embed them at the optimal capacity of the endpoints hardware. The script additionally creates a webhook interface to be notified when the Replicate endpoint has finished embedding any file in the list. It then downloads the embeddings file and stores it locally in .msgpack format for efficiency. The embeddings in these files may then be used with the vector database of your choosing. 

This script is intended to minimze the cost of computation. It is suitable for use only with replicate endpoints that are intended to be longrunning, and have internal logic for optimizing batch size.

Make sure to create a .env file with a REPLICATE_API_TOKEN variable before using. You may additionally need to set up ssl for Replicate webhooks to function.

Bun and Node are largely cross-compatible, so you can make minimal changes to this code to work as a node app, or alternatively try Bun.
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.