#!/bin/bash
curl\
  --cookie "token=$1"\
  -H 'Content-Type: application/json'\
  https://foodtrack-api.now.sh/tuppers
