#!/bin/bash
curl -X POST\
  -H 'Content-Type: application/json'\
  --data "{ \"name\": \"$1\", \"email\": \"$2\", \"password\": \"$3\" }"\
  https://foodtrack-api.now.sh/users
