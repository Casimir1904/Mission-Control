# Mission Control

**The open-source operations center for AI agents.**

```
  +----------------------------------+
  |                                  |
  |     M I S S I O N   C O N T R O L|
  |                                  |
  +----------------------------------+
```

---

- **Operations-first** -- Purpose-built for running AI agents in production: task boards, approvals, live status, and audit trails.
- **Self-hosted** -- Deploy on your own infrastructure with a single `docker compose up`. Your data never leaves your network.
- **Open-source** -- MIT licensed. Extend, customize, and contribute back.

## Quick Start

```bash
git clone https://github.com/mission-control/mission-control.git
cd mission-control
cp .env.example .env
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Screenshots

<!-- TODO: Add screenshots of the dashboard, task board, and agent management views -->

*Screenshots coming soon.*

## Tech Stack

![Go](https://img.shields.io/badge/Go-1.23-00ADD8?logo=go&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![NATS](https://img.shields.io/badge/NATS-2-27AAE1?logo=nats.io&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| **API**        | Go, chi router, Huma framework, Ent ORM         |
| **Frontend**   | Next.js, React, TanStack Query, Jotai, shadcn/ui|
| **Database**   | PostgreSQL 16                                    |
| **Cache**      | Redis 7                                          |
| **Messaging**  | NATS JetStream                                   |
| **Monorepo**   | Turborepo                                        |

## Architecture

```
                    +-------------+
                    |   Browser   |
                    +------+------+
                           |
                    +------v------+
                    |  Next.js    |  :3000
                    |  (apps/web) |
                    +------+------+
                           |
                    +------v------+
                    |  Go API     |  :8000
                    | (apps/api)  |
                    +------+------+
                           |
            +--------------+--------------+
            |              |              |
      +-----v----+  +-----v----+  +------v-----+
      |PostgreSQL |  |  Redis   |  |    NATS    |
      |   :5432   |  |  :6379   |  |   :4222    |
      +-----------+  +----------+  +------------+
```

For detailed architecture documentation, see [`docs/`](./docs/).

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full setup instructions.

```bash
# Start infrastructure
docker compose up postgres redis nats -d

# Start the API server
cd apps/api && go run ./cmd/server

# Start the frontend dev server
cd apps/web && npm install && npm run dev
```

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a pull request.

## License

[MIT](./LICENSE) -- Mission Control Contributors
