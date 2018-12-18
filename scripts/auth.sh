#!/bin/bash
curl -X POST\
  -H 'Content-Type: application/json'\
  --data "{ \"email\": \"$1\", \"password\": \"$2\" }"\
  http://localhost:3000/auth

