#!/bin/bash
curl -X DELETE\
  --cookie "token=$1"\
  -H 'Content-Type: application/json'\
  http://localhost:3000/tuppers/$2

