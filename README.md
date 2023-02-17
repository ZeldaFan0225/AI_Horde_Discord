# Stable_Horde_Discord

A basic Discord bot to generate images using the Stable Horde API.

**DISCLAIMER:** THIS REPOSITORY IS IN NO WAY ASSOCIATED TO THE CREATORS OF STABLE HORDE
YOU DO NOT HAVE PERMISSION TO USE THIS BOT COMMERCIALLLY OR USE THIS CODE IN FORM OF A PUBLIC DISCORD BOT WHICH CAN BE INVITED BY ANY DISCORD USER
YOU HAVE PERMISSION TO USE THIS BOT IN YOUR OWN DISCORD SERVER THROUGH A BOT ACCOUNT WHICH IS SET TO PRIVATE

## Features

View [the changelog](https://github.com/ZeldaFan0225/Stable_Horde_Discord/blob/main/changelog.md) to see what has been added

This package includes the code for a discord bot which interacts with the stable horde api.
The bot has the following features:

- /generate command with all options the api supports at the time of creating this file
- /login, /logout and /updatetoken for users to add and manage their account which they can create at https://stablehorde.net/register
- /userinfo (Userinfo context command) which shows your stable horde user information and the user information of anybody else who is logged in
- /terms which shows how the bot currently handles the api token and further information
- /models which shows all currently available models
- /worker which lets you see information on an active worker
- /team which lets you see information on a team
- /news which shows latest news about the horde
- /transferkudos (Transfer Kudos context command) to send somebody kudos
- /interrogate to interrogate any image
- /party to start a generation party with a given style
- "Remix" to edit another discord users avatar 
- "Caption" to caption anozher discord users avatar
- advanced configuration file which lets you change how the bot behaves and what actions the user can use (for limits refer to https://stablehorde.net/api)
- logging prompts, user id and generation id to track generation of malicious, nsfw or illegal content
- and even more...

## Version Requirements

- NodeJS >= 16.16

Optional:  
- PostgreSQL >= 14.6

## How to set up

1) download the code from this repository  
2) get the token of your discord bot (https://discord.com/developers/docs/reference#authentication)  
3) Install the node modules using `npm i` (make sure the dev dependencies are also installed for typescript to work)  
4) remove the `template.` from the `template.config.json` file  
  
If you want to have extra functionality do the following steps:  

5) set up a postgres database  
6) fill out the `template.env` and rename it to `.env`  
  
If you just want to generate images with no token or the default token in the config.json file do the following steps:  

5) modify the config file and set `use_database` to false  
6) fill out the `template.env` and rename it to `.env` (you can leave the keys prefixed with `DB_` empty)  
  
7) Run `npm run generate-key` and copy the generated encryption key in your `.env` (If you disabled token encryption you can leave it blank)
8) modify the [config.json](https://github.com/ZeldaFan0225/Stable_Horde_Discord/blob/main/template.config.json) file (from step 4) to fit your needs (you can read about what which property does in [config.md](https://github.com/ZeldaFan0225/Stable_Horde_Discord/blob/main/config.md))  
9) compile the code and start the process (this can be done by using `npm run deploy`)  
  
Now if everything is set up it should start and give an output in the console.  


## Encryption Key
When changing your encryption key after deployment the tokens won't be decrypted properly.  
Avoid changing the encryption key after initial setup.
Disabling encryption at any point will make commands for users who saved their tokens in an encrypted form not work any more.

## How to update

1) Pull the code from this repository
2) Update your config. Reading through the [changelog](https://github.com/ZeldaFan0225/Stable_Horde_Discord/blob/main/changelog.md) might help.
