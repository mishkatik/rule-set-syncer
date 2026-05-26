FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dev dependencies (needed for bun build --compile)
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# build compiled binary
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY tsconfig.json .
COPY src ./src
ENV NODE_ENV=production
RUN bun build --compile --minify src/index.ts --outfile out/rule-set-syncer

# final image — only the binary, no runtime needed
FROM oven/bun:1-distroless AS release
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/out/rule-set-syncer .

ENTRYPOINT ["./rule-set-syncer"]
