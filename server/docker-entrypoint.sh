#!/bin/sh

pnpm prisma migrate deploy

# Run your application
exec "$@"
