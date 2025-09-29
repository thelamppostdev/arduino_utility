#!/bin/bash

gh pr checks $1 --json bucket,event,name --repo $2
