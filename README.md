# Gather

Temporary, database-free group chat with media sharing.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:3000> in multiple tabs to test the shared room.

## Deploy on Render

This repository includes `render.yaml` for a free Render web service. Connect
the repository to Render, select the `main` branch, and create the service
from the Blueprint. Render will run `npm install`, start the app with `npm
start`, and use `/api/status` as the health check.

## How temporary storage works

- Messages are held in server memory, capped at the latest 200 messages.
- New joins never receive earlier messages; each browser sees only messages sent after it joins.
- Leaving clears that browser's conversation view, and the server clears the room when everyone has left.
- The composer includes a small emoji picker, and active users receive different animal/space avatars.
- Chat includes subtle sounds for sending and receiving messages, joins/leaves, voice recording, and emoji reactions. Sounds can be muted from the speaker button in the room header, and the preference is saved in the browser.
- Join and leave activity appears in the temporary chat timeline for everyone currently connected.
- Each connected user can share five media or voice attachments; after the fifth, media sharing pauses for five minutes.
- The room header includes reporting. Three different connected members reporting the same username removes that user from the room.
- Voice messages can be recorded by holding the microphone button and are sent when released.
- Uploaded files are held in server memory, capped at 10 MB per file.
- Files are removed after one hour.
- Restarting the server clears all messages and files.
- The PING logo is available at `public/logo.svg` and is used on the login page and browser tab.
- Login includes Aurora, Midnight, Ember, Mono, White, and Black themes; the selected theme is saved in the browser.
- Connect us email: `pingaplot@gmail.com`.
- An optional one-line login announcement can be edited in `public/app.js` using `LOGIN_NOTICE`; leave it empty to hide it.

This is intentionally lightweight and has no accounts, database, or persistent storage.
