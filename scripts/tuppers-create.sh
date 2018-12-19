#!/bin/bash
curl -X POST\
  --cookie "token=$1"\
  -H 'Content-Type: application/json'\
  --data "{ \"tagId\": \"$2\", \"name\": \"$3\", \"content\": \"$4\", \"stored\": \"$5\", \"cooked\": \"$6\", \"duration\": \"$7\" }"\
  http://localhost:3000/tuppers

