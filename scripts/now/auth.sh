#!/bin/bash
curl -X POST\
  -H 'Content-Type: application/json'\
  --data "{ \"email\": \"$1\", \"password\": \"$2\" }"\
  https://foodtrack-api.now.sh/auth

