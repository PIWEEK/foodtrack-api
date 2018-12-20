#!/bin/bash
curl -X POST\
  --cookie "token=$1"\
  -H 'Content-Type: application/json'\
  --data "{ \"tagId\": \"$2\", \"name\": \"$3\", \"content\": \"$4\", \"storedAt\": \"$5\", \"cookedAt\": \"$6\", \"notifyMeAt\": \"$7\", \"rations\": \"$8\" }"\
  https://foodtrack-api.now.sh/tuppers

