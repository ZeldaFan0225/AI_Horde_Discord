# Changelog

## V3.2.3

- fix a1111 weight conversion
- fix style processing, when style is not found return an error

## V3.2.2

- support for categories in parties and /generate, when a party is selected a random style will be chosen

## V3.2.1

- describing images: create a description for an image another user sent to the chat

## V3.2.0

- pay for every generation in a party, let the bot create a shared key which everybody will automatically when creating an image in the party!
- create a list of required words for generations in your party

**Migrating** 

MAKE SURE THE FOLLOWING STEPS ARE DONE IN ORDER
- run `ALTER TABLE parties ADD COLUMN shared_key VARCHAR(100)` on your postgres database before deploying this or any future version when using a database
- run `ALTER TABLE parties ADD COLUMN wordlist text[] NOT NULL DEFAULT '{}'` on your postgres database


## V3.1.0

- save horde user id for easy lookup
- update new result message for generations

**Migrating**

- run `ALTER TABLE user_tokens ADD COLUMN horde_id int NOT NULL DEFAULT 0` on your postgres database before deploying this or any future version when using a database

## V3.0.1

- add loras to generate and advanced_generate
- implement replacement filter
- add userinfo for horde ids

## V3.0.0

- update dependencies and require node 18 or above

## V2.4.1

- fixes to the kudos transfer by reacting

## V2.4.0

Introducing party mode:  
use /party to start a party and let users generate images with a given style  
users will automatically get rewards from you  
at the end of the party you will see a short summary  
only /generate can be used in parties 


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
