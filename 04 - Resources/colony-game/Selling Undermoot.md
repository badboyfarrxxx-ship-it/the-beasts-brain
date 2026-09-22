---
status: active
project: meta
type: plan
created: 2026-09-22
---
# Selling Undermoot

Research on where and how to sell *Undermoot: Rise of the Swarm*, the sellable build of
[[colony-game]], done 2026-09-22 for the [[Active Priorities]] item "start making money from
the programs I build". Figures are from public sources as of September 2026 (listed at the
bottom); third-party figures are marked as such. This is research and a recommendation, not a
decision: Nathan decides.

## The short version

1. **Don't sell it yet. Test it on real hardware first.** It has only ever run on a software
   renderer. The playbook's first rule is that the product comes first; a game that stutters
   on a buyer's laptop gets refunded and reviewed badly, and that sticks.
2. **Then put it on itch.io as a free browser demo plus a paid full game** (about US$4.99,
   pay-what-you-want above that). Nothing to pay up front, the lowest cut of any store, and it
   fits a single-file HTML game.
3. **Use the free demo to build an owned audience** (itch.io followers plus an email list),
   not just to show the game.
4. **Treat Steam as a later step, only if itch.io shows real interest.** It costs US$100, takes
   30%, needs the game wrapped as a desktop app, and procedural art is a harder sell there.
5. **Expect small money at first.** Most paid itch.io games earn under US$100 in their whole
   lifetime. A realistic first-year goal is a few hundred dollars and a list of people who
   liked the game. The list is what makes the next game easier to sell.

## What we are selling (from [[colony-game]])

- A colony-evolution RPG: a 2D colony screen, turn-based battles, and a walkable 3D world.
  12 zones, 34 creature types, 12 bosses, 6 companions, 13 story beats, and a real ending.
  About 290 fights to finish. Touch controls on phones. Saves in the browser, with export.
- One self-contained HTML file, **0.61 MB**, runs offline. That fits every store's limits
  easily (itch.io allows 500 MB, CrazyGames a 50 MB initial load).
- Original, with zero names from the *Chrysalis* books (scanned before every delivery).
- **Gaps:** the art is procedural, not hand made; play time in hours has never been
  measured; no outside player has tried it. (Performance is covered: 60 fps on the Surface in
  Firefox, 90 fps on an Android phone, and a clear notice on machines with no graphics
  driver; 2026-09-22.)

## The options

| Where | How you earn | Cost and cut | Fit for Undermoot |
|---|---|---|---|
| **itch.io** | Direct sales. Free demo plus paid full version, or pay-what-you-want | Free to list. You choose itch.io's share, 0 to 100% (default 10%). PayPal/Stripe take about US$0.30 + 2.9%. A US$10 sale nets about US$8.41 at the default | **Best first step.** Built for small HTML games, keeps the most per sale, no approval gate |
| **CrazyGames** | Ad revenue (their ads and rewarded video, via their SDK) | Free, no exclusivity. Developers get 60% of ad revenue per CrazyGames' own 2026 jam terms (standard deals not published). EUR 100 minimum payout. Starts as a "Basic Launch" with no ads to see if players stick, then invites to a paid "Full Launch" | **Good as a test of whether strangers play it.** Earns only from ads, so a free full game there competes with selling it on itch.io |
| **Poki** | Ad revenue | Invite-only and curated (about 1,500 games). 100% of revenue on traffic you bring, 50/50 on theirs (third-party figures); long exclusivity for full deals | Not now. Wants proven retention first |
| **Steam** | Direct sales | US$100 per game, refunded once it earns US$1,000. Valve takes 30%. About 30 days from signup to release. Needs the game wrapped as a desktop app (for example Electron) | **Later, if itch.io shows pull.** Biggest audience, but the art and the wrapper need work first |
| **Game Jolt, Newgrounds, Y8, others** | Mostly ads or tips | Varies | Extra reach for a free demo; not a sales channel |

### How games like it make money

Undermoot sits in idle/incremental RPG territory. The pattern among successful ones is a
**free version in the browser, and the paid version somewhere else**:

- *Melvor Idle*: a big free trial in the browser, paid full game on Steam (about US$10) and
  paid expansions. The best-known financial success in the genre.
- *Spaceplan*: free browser prototype; the paid app/Steam version (a few dollars) adds
  features and doubles the length. Has a real ending, like Undermoot.
- *Kittens Game*: free in the browser with no ads; the mobile version costs a couple of
  dollars as a one-off.

That backs the demo-plus-paid plan, and it suggests a low price: a few dollars, not ten.

### What to expect (be honest about this)

- **itch.io** (third-party estimate, 2026): about 80% of paid games earn under US$50 a month,
  and most earn under US$100 in their lifetime. Well-marketed launches commonly reach
  US$500 to US$5,000. One developer's honest public numbers: US$7,276 gross across 34 games
  over several years, almost all as tips, at an average of US$4.98 a payment.
- **Steam** (third-party, 2026): median indie game lifetime gross US$5,000 to US$15,000, but
  another analysis puts the 2025 median at about US$249. Either way, most games are never seen.
- **Web portals** (third-party, 2026): a decent casual HTML5 game earns roughly US$50 to
  US$1,500 a month, usually falling off after launch.

The difference between the bottom and the middle is almost always marketing, not the store.

## Recommended plan

**Step 0: make it sellable (do this first).**
- Play it on real hardware: this Surface, the HP, and a phone. Note frame rate, load time and
  anything that breaks. Fix what breaks.
  *Surface done, 2026-09-22 (Intel Iris Xe, Firefox):* loads in 136 ms, 3D world ready in
  2.2 s, a locked 60 fps at full quality with no dropped frames. (An earlier reading of
  about 30 fps was the Claude app's browser pane, which caps WebGL at 30; not the game.)
  *Phone done, 2026-09-22 (Android, Chrome):* 90 fps at full quality, the screen's full
  refresh rate. *HP:* no graphics driver, so the game now detects that, starts at the lightest
  setting and tells the player (confirmed on the HP); its with-driver re-test is parked.
  Detail in [[colony-game]], "Real-hardware test".
- Time a real playthrough of the first hour, so the store page can say how long the game is.
- Get three to five people who aren't Nathan to play the first 20 minutes and watch where they
  get confused or stop. (Poki's own guidance is that time played is the number that matters.)
- Decide whether the procedural art is good enough for a paid page, or whether a few `.glb`
  models (see [[colony-game]], "Real 3D models") are worth adding first.

**Step 1: split it into a demo and a full game.** *Designed 2026-09-23, spec in the working
copy at `docs/superpowers/specs/2026-09-23-demo-build-design.md`. Nathan's decisions: the demo
ends after zone 4 (Bramble Sinks, right after the Choosing of the Brood; 82 of 290 fights);
progress carries into the full game through the save code; the demo is cut from the sale
content at build time so the paid zones aren't in the free file. Store link left empty until
the itch.io page exists. Built 2026-09-23 on the working copy's `demo-build` branch, all
checks passing. Merged into `master` and delivered the same day: `undermoot-demo.html` is in
this folder (see [[colony-game]]). Status: built and delivered, not yet on itch.io.*
- The engine already supports this: a build is just another content file. A demo build ends
  after about three zones with a screen pointing to the full game.
- The demo plays in the browser on itch.io. The full game is a download (the same single HTML
  file), sold on the same page.

**Step 2: launch on itch.io.** *Upload mechanics checked against itch.io's own docs
2026-09-23:*
- *A self-contained single HTML file is uploaded **as is**, no zip. Zips are only for
  multi-file projects, and then they need an `index.html` inside. Both builds are single
  files, so nothing needs packaging.*
- ***Browser games on itch can only take donations, not sales.** itch's HTML5 guide says
  so plainly: to charge for something, its "Kind of Game" has to be Downloadable. The
  docs don't describe a paid page with a playable demo embedded in it, so the shape is
  probably two pages: a free HTML demo page (playable, donations on) linking to a paid
  downloadable page for the full game. Confirm that in the editor before building the page,
  because it decides the store link and the page copy.*
- ***Ordering trap: the demo's "Get the full game" button needs the store URL, which only
  exists once the page does.** `storeUrl` is empty in `src/demo.js`, and the button stays
  hidden while it is. So: create the page (unpublished) to get the URL, set `storeUrl`,
  rebuild the demo, then upload that build. Uploading the current file first means
  re-uploading later.*
- *Nathan has to create the itch.io account himself; the AI does not create accounts or
  enter payment details.*
- Price about **US$4.99**, pay-what-you-want above that (third-party guidance says PWYW buyers
  pay about 30% more on average; one developer reports never earning from PWYW with no minimum,
  so keep the minimum).
- Store page: sell the feeling, not the feature list (see below). Screenshots and a short
  gameplay clip matter more than any page design.
- Turn on itch.io's option to collect buyer emails (opt-in), and put a "get news of the next
  game" link in the demo's end screen. That's the owned list.
- Revenue share: the default 10% is fine; it can be changed any time.

**Step 2b: host the installable demo (researched 2026-09-23).** The demo is now an
installable app (see [[colony-game]], "Installable app"), but a browser only offers to
install it over https and never inside an iframe, so the itch.io embed cannot do it. It
needs a real address of its own. All three free options were checked against their own
docs on 2026-09-23:

| Host | Free tier | Fit |
|---|---|---|
| **Cloudflare Pages** | No bandwidth charge on static assets. 500 builds a month, 20,000 files, 25 MiB per file, 100 projects. Works from a private repo, or with no repo at all | **Recommended.** The game is one 0.63 MB file, nowhere near any limit |
| **Netlify** | Credit-based since 2026: 300 credits a month, bandwidth 20 credits per GB, 15 credits per production deploy. That is roughly 15 GB, about 24,000 plays, minus deploys | Works, but the credit model is a meter to watch for no gain here |
| **GitHub Pages** | Free **only on public repos**; private repos need GitHub Pro | **No.** `colony-game` holds the fan build and must stay private, so this would mean a second public repo or a paid plan |

**Use Cloudflare Pages with Direct Upload, not the Git integration.** Direct upload takes
a folder (drag and drop on their dashboard, or `npx wrangler pages deploy`), so the only
bytes that leave the machine are `dist/pwa-demo/`. No access to the repo, no build config
to get wrong, and no way to publish the fan build or the paid zones by accident. One
catch from their docs: a direct-upload project **cannot be switched to Git integration
later**; that needs a new project. Nathan creates the Cloudflare account himself. Cost:
zero, on a `<name>.pages.dev` address. A custom domain is optional and works on the free
plan.

**The part this does not solve: the full game can't be an installed app.** Installing
needs https, and a bought copy is a file on the buyer's disk, so a paid download stays a
double-clickable HTML file, not an app with an icon. The options were a wrapped Windows
build (the same work Steam needs), a per-buyer hosted address (itch's download keys do not
do this), or accepting it.

**Decided 2026-09-23 (Nathan): accept it.** The demo is the installable piece and the
purchase stays a file. No desktop wrapper is being built for now. The odd consequence is
worth remembering when the store page is written: the free thing installs and the paid
thing does not, so the paid page has to sell the eight extra zones and the ending, never
convenience. Revisit only if Steam comes back on the table, since the wrapper is the same
work.

**Step 3: get it seen.** itch.io's own traffic is thin; most sales come from what you bring.
Devlogs on the itch.io page, short clips (the 3D world and a boss fight), posts in
incremental-game communities (r/incremental_games and similar), and game jams.

**Step 4: decide on the next platform from real numbers.** After a month or two: if the demo
gets played and people buy, look at Steam (wrapper, better art, US$100). If people play but
don't buy, a free ad-supported version on CrazyGames may earn more than sales.

## Selling the feeling (from [[Marketing]])

The playbook's core rule is to sell how the customer feels, not what the product does. For
Undermoot that is something like: *starting as one small thing in the dark and growing into
something the whole underworld fears*. The pull of watching a colony grow from nothing, and
of beating the boss that crushed you an hour ago. The store page headline should say that,
not "12 zones and 34 creatures". Drafting that copy is its own job: read [[jareds-takes]] and
[[marketing-copywriting]] first.

## Money and tax basics (general information, not advice)

- **Australia:** income from selling games is taxable. Whether it counts as a hobby or a
  business depends on how it's run; business.gov.au explains the difference. An ABN is free
  and useful once it's a business. GST registration is only required above A$75,000 turnover
  a year. Confirm the right setup with an accountant before real money comes in.
- **US forms:** US stores (itch.io, Steam) ask non-US sellers for a tax form (W-8BEN). Filled in
  correctly, the Australia-US tax treaty lowers the US withholding on these sales well below
  the default 30%; check the exact rate on the form itself.
- **Payouts:** itch.io pays out through PayPal or Stripe; CrazyGames through Tipalti (wire,
  ACH or PayPal), minimum EUR 100.

## Open questions for Nathan

- Is the procedural art good enough to sell as is, or add some real models first?
- Sell it (itch.io demo plus paid), or give it away with ads (CrazyGames)? The plan above says
  sell first.
- Where should the store page and email list live under his name (itch.io account, a simple
  landing page)?

## Sources

- itch.io creator docs: [FAQ](https://itch.io/docs/creators/faq),
  [payments and revenue share](https://itch.io/docs/creators/payments),
  [HTML5 limits](https://itch.io/docs/creators/html5)
- Steam: [Steam Direct fee](https://partner.steamgames.com/doc/gettingstarted/appfee);
  [Ziva, "How to Publish a Game on Steam in 2026"](https://ziva.sh/blogs/publish-game-steam);
  [Xsolla self-publishing guide](https://xsolla.com/blog/self-publish-on-steam-the-ultimate-guide)
- CrazyGames: [2026 GameMaker jam terms (60/40 ad share)](https://crazygames.indiehero.io/cggmwj-jg);
  [Cinevva CrazyGames guide, July 2026](https://app.cinevva.com/guides/publish-game-crazygames)
- Portal comparisons and web-game income (third-party):
  [PixelGameCraft, HTML5 monetization 2026](https://pixelgamecraft.com/blog/html5-game-monetization),
  [PixelGameCraft, HTML5 game income 2026](https://pixelgamecraft.com/blog/html5-game-income)
- Poki: [Poki for Developers](https://developers.poki.com/guide/share)
- itch.io earnings (third-party and first-hand):
  [Generalist Programmer, itch.io revenue guide 2026](https://generalistprogrammer.com/tutorials/how-to-make-money-on-itchio-indie-game-guide),
  [Nathalie Lawhead's itch.io numbers](https://www.nathalielawhead.com/candybox/my-gross-revenue-on-itch-io-transparently-sharing-all-my-stats-earnings-and-speaking-on-how-supportive-of-a-base-itch-io-has),
  [itch.io forum: free vs paid](https://itch.io/t/2415332/is-it-better-to-publish-your-game-as-free-or-paid-on-itchio-which-is-more-worth-it)
- Steam earnings (third-party):
  [Steam Page Analyzer, indie revenue 2026](https://www.steampageanalyzer.com/blog/indie-game-revenue-data)
- Comparable games: [Melvor Idle overview](https://the-valiant.com/games-like-melvor-idle),
  [Quarter to Three thread on Spaceplan, Kittens Game and others](https://forum.quartertothree.com/t/some-incremental-idle-clicker-games-including-really-a-lot-of-incremental-epic-hero-2/145358)
- Australia: [business.gov.au, hobby or business](https://business.gov.au/planning/new-businesses/difference-between-a-business-and-a-hobby)
