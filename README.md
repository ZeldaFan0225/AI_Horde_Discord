# Stable_Horde_Discord

A basic Discord bot to generate images using the Stable Horde API.

**DISCLAIMER:** THIS REPOSITORY IS IN NO WAY ASSOCIATED TO THE CREATORS OF STABLE HORDE
YOU DO NOT HAVE PERMISSION TO USE THIS BOT COMMERCIALLLY OR USE THIS CODE IN FORM OF A PUBLIC DISCORD BOT
YOU ONLY HAVE PERMISSION TO USE THIS BOT IN YOUR SERVER WITH A PRIVATE BOT ACCOUNT

You can support me and my projects on [Ko-Fi](https://ko-fi.com/slashbot)

## Features

This package includes the code for a discord bot which interacts with the stable horde api.
The bot has the following features:

- /generate command with all options the api supports at the time of creating this file
- /login, /logout and /updatetoken for users to add and manage their account which they can create at https://stablehorde.net/register
- /userinfo which shows your stable horde user information and the user information of anybody else who is logged in
- /terms which shows how the bot currently handles the api token and further information
- advanced configuration file which lets you change how the bot behaves and what actions the user can use (for limits refer to https://stablehorde.net/register)
- logging for any malicious, nsfw or illegal content

## How to set up

1) download the code from this repository
2) get the token of your discord bot (https://discord.com/developers/docs/reference#authentication)
3) set up a postgres database
4) Install the node modules using `npm i` (make sure the dev dependencies are also installed for typescript to work)
5) fill out the `template.env` and rename it to `.env`
6) compile the typescript code (this can be done with `npx tsc -p .` in the directory where you place the code
7) [modify the config file to fit your needs](https://github.com/ZeldaFan0225/Stable_Horde_Discord/blob/main/config.md)
8) start the process (`node .` since the main file is saved in config.json)

Now if everything is set up it should start and give an output in the console.

**IMPORTANT**
- when setting up this repository, after installing the node modules go to the folder `/node_modules/webp-converter` and create a folder called `temp`
