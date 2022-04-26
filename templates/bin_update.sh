#!/usr/bin/env sh

set -u -e -o pipefail

if test -d node_modules ; then
  npm update
fi # if

for x in $(find bin src spec -type f -name '*.ts') ; do
  echo "=== deno cache --reload "$x""
  deno cache --reload "$x"
done
