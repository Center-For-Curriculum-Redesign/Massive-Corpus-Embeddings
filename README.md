# bunhook

This contarepo contains a Bun / Nodejs implementation for embedding large text corpuses at scale with Replicate API using the CCR embedding template. It sends the replicate endpoint a large list of URLs from which multiple files of chunked text data may be downloaded, and creates a webhook interface to be notified when the Replicate endpoint has finished embedding a file. It then downloads the embeddings file and stores it locally in .msgpack format for efficiency. The embeddings in these files may then be used with the vector database of your choosing.

Make sure to create a .env file with a REPLICATE_API_TOKEN variable before using. You may additionally need to set up ssl for webhooks to function.

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