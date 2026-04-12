<p align="center">
  <img src="./img/banner.png" alt="rip searchhub" width="400" />
</p>

# SearchHubDiscordTokensFinder - Don't be mad SearchHub

# Explanation

This GitHub repository allows you to detect and ban Discord tokens from [SearchHub](https://searchhub.vip) on your Discord server.

Indeed, you’re supposed to know that Discord has now become a hostile land for the confidentiality of your private life. Not only does the platform itself log absolutely every activity, but it also even illegally prevents you from deleting your own messages [source](https://github.com/victornpb/undiscord/discussions/429).

And now, users of the platform index, save, and track your every move inside public Discord servers. It has become commonplace to see completely illegal platforms like SearchHub appear, and for the ridiculous price of 5€, allow access to so much personal information about anyone, as precious as it may be.

## We need to say stop!

Why let this happen? Seriously, we need to know how to say no to this kind of thing. It *should* shock us — shock us to see that random people now have access to your private and precious intimacy on their illegal infrastructure.

# The fight

I know I’m fighting bare-handed against the overwhelming power of their industry. But if you too are fed up with your privacy, your messages, your freedom being crushed by people who publicly spread your every move — then yes, the fight is legitimate.

# How to fight effectively

There is not really any viable way to fight this (AT LARGE SCALE). SearchHub, like many others, indexes your servers very efficiently.

It looks at discovery pages, inspects people’s statuses on public servers to find invitation links, makes tokens join servers, and then recursively re-inspects bios...

This mechanic is industrial.

So how do we fight, how do we counter these massive attacks against your most fundamental right: the right to have a private life?

This is why this GitHub repository exists.

# Filter Discord accounts at the server entrance

As I said above, the arrival of tokens on your Discord server is an obvious reality. To block them, you will have to switch your Discord server to **Apply to Join**.

Start by putting your server in private profile mode; this will prevent SearchHub from indexing your server through emojis or Discord tags.

![img tip1](./img/tip1.png)

Next, here is where you need to go to enable “Apply To Join”:

![img tip2](./img/tip2.png)

Apply To Join is a system where you can ask customizable questions to new arrivals. They will be placed in a queue and will *not* be inside your Discord server while waiting. They won’t have access to messages or private content. Of course, bots can still answer the questions if their program is well made; that’s why you’ll be able to inspect their profile (account creation date too recent, recurring profile picture, “robotic” bio, connections, etc.). You can even create a group chat with the member to ask more questions if you have doubts.

# Find and eliminate the tokens

Here comes the main course! This GitHub repository will allow you to tear those bastards a new one… To ban the Discord tokens present in your server. How does this program work?
Very simple — here’s an explanation:

[explanation](./ENGLISH.EXPLAIN_THE_SOFT.md)

# Ready to fight? Let’s go

Well, to fight them, you’re going to have to fatten them up a bit. You will need access to their service to get their API and deduce the token inside your server. I’ll let you figure out how to pay!

## Step 2 — prepare a real browser profile for SearchHub

### Watch the video: https://files.catbox.moe/w2qk5s.mp4

The bot now relies on a real browser session with a persistent Chrome profile to pass the Cloudflare challenge. You therefore need to:

* log into SearchHub inside a dedicated Chrome profile
* reuse that profile through `BROWSER_PROFILE_PATH`
* optionally define `PUPPETEER_EXECUTABLE_PATH` if Chrome is not detected automatically

Example profile:

![img tip2](./img/tip4.png)

## Step 3 — start configuring the environment file

Rename `.env.example` to `.env`.

Inside the `.env`:

```env
TOKEN="BOT TOKEN"
DEFAULT_PREFIX="!"
BOT_OWNERS="123456789012345678"
DATABASE_PATH="./data/bot.sqlite"
SEARCH_GROUP_SIZE="200"
SEARCH_MESSAGE_WAIT_MS="10000"
SEARCHHUB_CHALLENGE_TIMEOUT_MS="120000"
BROWSER_PROFILE_PATH="/path/to/chrome/profile"
PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome-stable"
```

* Copy your server’s ID
  ![img tip2](./img/tip5.png)
  If you don’t have the “Copy Server ID” button, go to: user settings > Advanced > Developer Mode > enable it.

* Get the bot token — CHECK [THIS DOCUMENTATION](https://docs.ihorizon.org/token-setup/create-token/)

* The user account token used for the SearchHub test is then configured through the bot prefix command

You need common sense and basic computer usage knowledge before doing this.

### Step 4 — install the BunJS runtime to run the program

I use **Bun** in development; my code contains functions usable only with Bun. So no NodeJS.

[You can find a simple tutorial to install Bun here](https://bun.sh/)

# And that’s it — just read the terminal

It takes time — the more members you have on your Discord server, the longer it will take.
