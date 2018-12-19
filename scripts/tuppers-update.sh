#!/bin/bash
curl -X PUT\
  --cookie "token=$1"\
  -H 'Content-Type: application/json'\
  --data "{ \"tagId\": \"$3\", \"name\": \"$4\", \"content\": \"$5\", \"stored\": \"$6\", \"cooked\": \"$7\", \"duration\": \"$8\" }"\
  http://localhost:3000/tuppers/$2

