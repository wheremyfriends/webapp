#!/bin/sh

until pnpm prisma migrate deploy
do
    echo "Command failed. Retrying..."
    sleep 5 # Wait for 5 seconds before retrying
done


# Run your application
exec "$@"
