# EDF Tempo - Addon for Home Assistant

Get daily Tempo color from [EDF](https://particulier.edf.fr/) to Home Assistant.

### Motivation

I wanted to get all metrics about power, water consumptions in one place: Home Assistant. I reached out to know if there's any plan for a public API, unfortunately they told me it was only for companies.

## Installation

 - Add the add-ons repository to your Home Assistant: `https://github.com/sannremy/home-assistant-edf-tempo`.
 - Install the *EDF - Tempo* add-on.

## Configuration

|Option|Required|Description|
|---------|--------|-----------|
|`cron`|No|This will fetch the Tempo info. Default is every 3 hours: `0 */3 * * *`. If set, it will override the time when the job runs.|

## Contributing

Feel free to contribute by submitting issues and pull requests.
