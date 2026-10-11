# Demo day checklist

One page for the morning. Tick each box. The full script is in `docs/demo-script.md` and the
words are in `docs/pitch.md`.

## The night before or first thing

- [ ] **API keys are in Vercel.** Ask whoever owns the Vercel project to add
      `ANTHROPIC_API_KEY` (Import) and `ELEVENLABS_API_KEY` (Listen) under Settings >
      Environment Variables, then redeploy. If they cannot, we do not mention Import or
      ElevenLabs.
- [ ] **Everyone's fix branches are reviewed.** `fix/screens` and `fix/logic` wait for their
      owners (see `docs/overnight-report.md`). Merge or drop each one. Nothing new after that.
- [ ] **Two phones charged to 100%**, plus a charger and cable at the table.
- [ ] **Backup video recorded** of the whole demo (see "Record the backup" below) and saved on
      the stage phone **and** a laptop.

## One hour before

On the phone you present from:

1. [ ] Open **https://layoverapp.vercel.app** in the browser you will use.
2. [ ] Tap **Continue as guest** if the sign-in screen shows.
3. [ ] Menu (top right) > **Clear this trip** > **Clear trip**, so you start clean.
4. [ ] Do one full practice run: **Try the sample trip**, wait for the change, **Mark done**,
       **Share update**, **Copy link**, open it.
5. [ ] Tap **Listen** once. Is it the voice picked in the menu (ElevenLabs) or the
       phone's own voice? Only say "ElevenLabs" if it is the picked voice.
6. [ ] If you will show Send help: with the trip open, **Settings** > **Send help** > paste the
       Traveler wallet address > **Save address**.
       Then use **Restart the demo trip** from now on, not **Clear this trip** (clearing wipes
       the address).
7. [ ] Menu > **Restart the demo trip** > **Restart**, then go to the home screen and **stop**.
       Check the **Next** button shows at the bottom right (Settings > Demo > **Demo
       controls** on). With it on, nothing changes until you tap **Next: Change the flight**.
8. [ ] Phone: volume up, Do Not Disturb on, auto-lock off (Settings > Display & Brightness >
       Auto-Lock > Never), brightness up.

On the second phone (for the shared link and Send help):

1. [ ] Phantom open, **Testnet Mode** on, **Helper** account selected.
2. [ ] Messages and Mail set up on the demo phone, so **Text Marco** and **Email Mum** open
   straight into a filled-in message.

## At the table

1. [ ] Say the feed is simulated before a judge asks.
2. [ ] Follow `docs/demo-script.md` steps 1 to 5. About 90 seconds.
3. [ ] Hand "how does it work" questions to the teammate in the table at the end of the pitch.

## If something breaks

| What happens | What to do |
| --- | --- |
| The page will not load | Phone hotspot, reload. Still nothing: play the backup video. |
| The trip already shows a change | Menu > **Restart the demo trip** > **Restart**. |
| The change has not happened | Tap **Next: Change the flight** (bottom right), or **Simulate a change** on the home screen. |
| The Next button is missing | Settings > Demo > switch **Demo controls** on. |
| Listen is silent | Check the silent switch. Otherwise skip it. |
| Send help does not open a wallet | Show the QR code and scan it from the second phone instead. |

## Record the backup (10 minutes, once everything works)

1. iPhone: Settings > Control Center > add **Screen Recording**.
2. On the stage phone: menu > **Restart the demo trip** > **Restart**.
3. Swipe down from the top right, tap the record button, wait for the countdown.
4. Do the whole demo: the change arriving, **To do** > **Mark done**, **Share update**, **Copy link**,
   the shared page, and Send help if it is working.
5. Stop the recording. It saves to Photos.
6. AirDrop it to a laptop as a second copy.
