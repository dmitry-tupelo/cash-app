Decisions. 
How you represent and calculate amounts.
Crypto assets carry many more decimals than a bank’s 2 (6 for USDT, 8 for BTC, 18 for ETH), so balances are stored as bigint counts of each asset’s smallest unit and always shown in full precision, never rounded or passed through floating point.

What the balance shows right after a claim is submitted. Two pieces of user feedback pull in opposite directions. One user said: "I claimed and my balance didn't change, so I claimed again." Another said: "My balance dropped, then jumped back up, and I stopped trusting the app."
Balance after a claim. The snapshot updates every 15s, so right after a claim it may still show the old balance. Options: show server data only (the user may claim twice), lock the asset until it refreshes (blank for 15–30s), or subtract locally. I subtract locally until a snapshot newer than the claim arrives, so the balance never jumps back. Failed claims return with a clear message. Approaches in ai-logs/<file>.


What the user sees, and what the app does, when the result of a claim request is unknown, for example after a timeout.

Working with AI. Describe three moments and point to where each one is in ai-logs/:
a prompt that did not get you what you wanted, and how you changed it
a time AI output was wrong or risky, and how you found out
a time you disagreed with the AI or rejected a suggestion, and why

Not done / known issues. Say what is missing or wrong and what you would do next.
May be improved refresh logic in case of UX