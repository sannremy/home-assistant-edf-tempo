#!/usr/bin/with-contenv bashio

export EDF_CRON="$(bashio::config 'cron')"

# Run script once
node edf.js
