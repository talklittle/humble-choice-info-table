#!/bin/bash

OUT_FILE="$1"

# Remove "Changelog" heading, and replace markdown headings with bold
RELEASE_NOTES=$(sed -E -e '1,2d' -e 's/^#+ ?(.*)$/\*\*\1\*\*/' CHANGELOG.md)

jq --null-input --arg release_notes "$RELEASE_NOTES" '{
  version: {
    release_notes: {
      "en-US": $release_notes
    }
  }
}' > "$OUT_FILE"