# Ajoissa: lessons learned

What we learned building Ajoissa for the AstraZeneca challenge "Equal Care Across Finland" at Junction 2026.

## 1. Narrow the scope until one person can act on it

We started with three tools: a patient page (a symptom diary and risk check), a hospital page and a county page. They covered every step from first symptom to treatment, but no single user could act on all of it, and the patient page would have handled personal health data. The brief asks for public, aggregate data.

We cut to one question a county screening lead can act on: *where does my county lose people in screening, and what do we do first?* The earlier pages are still in the code, hidden behind one setting, and their addresses go to the landing page.

**Lesson:** a tool that answers one question for one person beats three tools that each answer part of one.

## 2. A missing number is not a missing patient

In the Cancer Registry's 2024 cervical figures, Varsinais-Suomi has 4 colposcopies on record for 190 referred women. Read at face value, that would be the worst follow-up in Finland. It is far more likely that results are not reaching the register.

We added a rule: under a quarter of the national rate, or 20% or more of referred women with no result on record, is flagged as a likely reporting gap. Those figures say "Check data" instead of being compared. We did the same where the Registry itself warns that a short wait may reflect how dates are recorded (cervical waits in Etelä-Savo and Pohjois-Savo).

**Lesson:** read the registry's own caveats before ranking anyone; a data fix is often the first fix.

## 3. Let the AI write words, never numbers

The first AI briefings were fluent, and that was exactly the risk. Our rule became: the model only writes words. Every number it may use is in a facts object already calculated by the app. Every number in its answer must match one of those figures, and every citation must point to a passage we gave it from 14 reviewed sources. Overclaims such as "lives saved" are rejected. If any check fails, a fixed template is used and the plan says why in one line.

Two bugs taught us to test the checker as carefully as the model:

- "2,050" was read as two numbers (2 and 050) and failed a correct briefing. Thousands separators are now handled on both server and browser.
- A briefing could leave out a reporting-gap warning that the facts flagged. That is now a rule of its own.

**Lesson:** the checks are the product. Show them to the user: the plan lists how many numbers and citations were checked.

## 4. Fallbacks make demos safe

Our first live run failed with an authentication error. The server's key setting held the key's *name*, not the key. We added a key-format check and a health endpoint that report the problem without ever printing the key. Because the template fallback already existed, the page never broke, it just said why.

**Lesson:** design the failure path first. On stage, "the AI is unavailable, so this uses the template" is fine; a blank page is not.

## 5. Estimates must say they are estimates

Every action's effect comes from a published study, mostly from other countries. Bowel follow-up evidence is mostly from the United States; the cervical self-sampling trial is Finnish (Espoo). We apply the effect to the county's 2024 numbers and label it "an estimate, not a promise". Our warning lines are labelled as ours: only the 80% participation goal is official. Each tab lists "What we calculated ourselves".

**Lesson:** decision-makers trust a tool more when it says plainly which numbers are the registry's and which are ours.

## 6. Say what the data cannot show

The strategy's Goal 3 indicator is treatment within target times, but time to treatment is not published by county. We say so in the app. The follow-up and wait steps are the closest public figures, and for bowel we show the Registry's count of treatment starts.

**Lesson:** naming the data gap is part of the answer, not a weakness to hide.

## 7. Plain words for each audience

County staff read "invited" as the Registry's denominator. Residents read it as an odd, official word. The residents page uses "who it's for", "women offered a mammogram took part" and "take part when your letter arrives", with the same numbers. "Above / below Finland" became "better than / worse than / close to the Finnish average", because "above" is not always good.

We also decided against anything that targets people by language or writes messages for them. Those risks outweighed the benefit in a hackathon prototype.

**Lesson:** same facts, different words for different readers, and test every label by asking "better or worse for whom?".

## 8. Less on the screen, more in the plan

Early versions had a county ranking, a big map section and several explanation blocks on one page, and it felt cluttered. We kept one verdict, three tiles and one action on screen, and moved the rest into an evidence section opened on demand and a one-page plan. Small charts replaced paragraphs on the plan, with the numbers still written next to every bar.

**Lesson:** the two-minute test (can a decision-maker get the message and the action in two minutes?) is a design tool, not just a judging criterion.

## 9. Check the limits of the target, not just the code

Two late surprises:

- A live AI briefing made the one-page plan 311 mm long, more than an A4 page holds. Plans now scale to fit when printed.
- The submission form's limit was 5,000 *characters*, not words.

**Lesson:** test against the real output (paper, form, projector), not the preview.
