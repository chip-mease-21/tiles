# Heart and Treasure

A shared workspace that is not the DLT board and not anybody's private tiles.

## What it is

The same board you already use — same columns, same tiles, same drag and drop,
same tag system — pointed at a different collection. Every card carries an
owner, so either of you can hand work to the other, and a filter switches
between Mine, Theirs and Everything.

Tags are shared, so `book`, `workbook`, `marketing` and `website` mean the same
thing on both screens.

## Who can see it

Only people with a seat in the space. That is a completely separate list from
the DLT board. Matt, Gabe and Rachel cannot read a word of it, and neither can
anybody else at the church — not because the tab is hidden from them, but
because no rule grants them anything under `spaces/ht`. There is no admin
override in that section on purpose.

The reverse is also true and also tested: a Heart and Treasure seat reaches
nothing on the DLT board and nothing in anyone's private roles card.

## Setting it up, once

The first seat goes in by hand for the same reason the org's did: a bootstrap
path is an escalation path.

In the Firebase console, create two documents.

```
spaces/ht
  name: "Heart and Treasure"

spaces/ht/members/9LqrNafqIrhVFs3jlRHnoHRINwm2
  name:   "Chip Measells"
  email:  "chip@thepointcville.com"
  active: true          <- boolean, not the text "true"
```

That is all. Everything after this happens in the app.

## Adding Karen

Open the Heart & Treasure tab, click **Who is in here**, and add her name and
the email address on her Google account. She does not need to do anything
first and she never has to send you an id.

When she signs in, the app matches her verified email to the invite and seats
her. Because she has no seat on the DLT board, she lands straight on Heart and
Treasure with no other navigation — no church tabs, no personal tiles board,
nothing to explain.

If she signs in and lands on an empty screen instead, the address on her Google
account differs from the one you invited. The screen tells her which address
she is actually signed in with.

## Once you are both in

Either of you can assign a card to the other. New cards start **unassigned** on
purpose rather than defaulting to whoever typed them, so unclaimed work reads as
unclaimed rather than quietly landing on someone. Unassigned cards show up under
**Theirs**, which is the filter to check when you want to know what is falling
between you.

Removing somebody is mutual — you can each deactivate the other but not
yourself, so neither of you can lock the space down alone.
