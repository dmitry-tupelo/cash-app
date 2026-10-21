# Notes

## Decisions

### Amounts

Crypto assets carry many more decimals than a bank’s 2 (6 for USDT, 8 for BTC, 18 for ETH), so balances are stored as bigint counts of each asset’s smallest unit and always shown in full precision, never rounded or passed through floating point.

### Balance after a claim

The snapshot updates every 15s, so right after a claim it may still show the old balance. Options: show server data only (the user may claim twice), lock the asset until it refreshes (blank for 15–30s), or subtract locally. I subtract locally until a snapshot newer than the claim arrives, so the balance never jumps back. Failed claims return with a clear message. Approaches in [ai-logs/claude-code-session.md](ai-logs/claude-code-session.md).

### Unknown claim result (e.g. after a timeout)

If we don’t know whether a claim went through, the app sends the same request again with the same key. The server sees the same key and never creates a second claim. The user sees “Confirming…”, and if that still fails, a “Check again” button. They can’t start a new claim until this one is sorted out. A simple “Try again” button alone wasn’t enough: the user could leave, claim again, and get paid twice.

## Working with AI

All three moments are in [ai-logs/claude-code-session.md](ai-logs/claude-code-session.md).

- **Prompt that didn’t work.** Refresh came out buggy: the timer started at 5, and double taps were possible. I re-asked with exact rules: disable the button, show a spinner, reset the timer.
- **AI was wrong.** The claim form read “1,234” as 1.234, so a user could claim 1000× less. I caught it in review and made such input rejected.
- **I disagreed.** The AI recommended option B for the balance after a claim. I took B but changed it: failed claims are skipped, completed ones aren’t counted as claiming.

## Not done / known issues

- Refresh logic may be improved for better UX.
- Amount input rejects anything that looks like thousands grouping ("1,234", "1,234.5") instead of guessing, because the app itself displays 1,234 as one thousand. Side effect: on a phone whose decimal keypad only has a comma, an amount like 1.234 (1–3 digit integer part, exactly 3 decimals) can't be typed; Max or a trailing zero ("1,2340") works around it. Next: a decimal-separator hint by the field, or use the device locale to decide what a comma means.
