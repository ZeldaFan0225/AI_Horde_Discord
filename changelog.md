# Changelog

## V2.3.3

- add remix context menu to remix users avatars with prompts

## V2.3.2

- add ability to gift kudos on /generate and /advanced_generate result messages

## V2.3.1

- rename /generate to /advanced_generate
- add /generate as a simpler and easier way to generate images
- add apply_roles_to_trusted_users


## V2.2.1

- fix bugs
- add `pre_check_prompts_for_suspicion` function to prevent the bots IP to be banned from the API (requires special access to the api)


## V2.2.0

- added token encryption
- add notes in /login and /updatetoken showing whether the bot encrypts the tokens when saving them in the database
- check permissions for the bot in the current channel to prevent errors
- add action filter for rather guild specific actions

**Migrating**

- run `npm run generate-key`, save the key in the `.env` file for the key `ENCRYPTION_KEY`
All old tokens will still be usable but will not be encrypted, to encrypt the token the user has to log out and log back in.