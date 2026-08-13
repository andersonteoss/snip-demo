# Snip CLI

Zero-dependency Node CLI for the Snip URL shortener backend.

## Commands

- `snip add <url>`: create a short URL and print it
- `snip ls`: list all links as code/hits/url
- `snip open <code>`: resolve and open target URL in your browser
- `snip help`: show usage

## Environment

- `SNIP_API`: backend base URL (default `http://localhost:3000`)

## Run

- `node cli.js help`
- `node cli.js ls`
