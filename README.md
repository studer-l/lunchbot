# Lunchbot

[Zulip](https://zulip.com) bot to organize groups for lunch at [Distran](https://distran.ch).

Users sign up by reacting with an emoji to a Zulip message. They are then split
up into small groups, each with a captain in charge of choosing the lunch
destination and someone who has a company credit card to pay 😏

## Features

- An attempt is made to optimize the groups to minimize repetition and mix it up
- This bot is much more cheerful than its older sibling, [Breakfastbot](https://github.com/studer-l/breakfastbot/tree/master)
- Manual drive only: Bot must be directed manually to announce and organize a lunch

## Hacking

A postgres database is expected at `LUNCHBOT_DB_URL`. The provided flake
provides this automatically when using the
[process-compose-flake](https://github.com/Platonic-Systems/process-compose-flake)
provided via `nix run .#develop`.

Check `src/config.ts` for other environment variables that should be set. Zulip
credentials are not required for the tests to succeed.

To run the tests: `npm run watch:test`.

To create a release: `nix build .#docker`.
