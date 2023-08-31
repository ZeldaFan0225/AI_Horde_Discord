# Runtime management
For anyone wanting to run this on their own linux setup, but keep it relatively updatable without permission hell:
`~/.config/systemd/user/hordebot.service`
```ini
[Unit]
Description=AI Horde Discord bot
After=network.target

[Service]
Type=simple
WorkingDirectory=%h/apps/AI_Horde_Discord
ExecStart=/usr/bin/npm run deploy

[Install]
WantedBy=default.target
```
then just load it up with the following:
- `systemctl --user daemon-reload` - makes sytstemd reparse all the potential configs
- `systemctl --user enable hordebot.service` - makes systemd autostart the service at boot
- `systemctl --user start hordebot.service` - makes systemd start the service now
the `--user` stuff makes it run as just your user, no fancy permissions, no fuss - and you can just update with normal git commands.

Assumes:
- you're on a systemd based system. If you're not you probably know what you're doing anyways
- assumes your `/usr/bin/npm` is the correct one

# Postgres bootstrapping
(writing this form a fedora POV, but it probably translates)
## Initial configs
The default configs have gotten a bit pickier lately. you may need to find your pg_hba.conf and change the "method" from `ident` to `md5`
- in fedora this config is at `/var/lib/pgsql/data/pg_hba.conf`
- use the host for ipv4 because I use 127.0.0.1 as my db_ip

# Setup the user
to get logged into PSQL to start with do `sudo -i -u postgres psql`
## Make the user and privlidge it
- `CREATE ROLE aihordebot WITH LOGIN PASSWORD '1337haxxor';` - make the user, change out the password
- `CREATE database hordebot` - make the database
- `GRANT ALL PRIVILEGES ON DATABASE hordebot TO aihordebot;` - grants general permissions
- `\c hordebot` - we need to go deeper
- `GRANT USAGE, CREATE ON SCHEMA public TO aihordebot;` - and make sure the user can change the schema and set stuff up

This setup guide was written by [thebwt](https://github.com/thebwt)
