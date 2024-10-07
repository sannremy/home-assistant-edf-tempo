#!/usr/bin/with-contenv bashio

export EDF_CRON="$(bashio::config 'tempocron')"

# Run script once
node edf.js
