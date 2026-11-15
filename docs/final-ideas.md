# AstraZeneca challenge: our final ideas

> **Earlier draft.** This was the plan before we narrowed the build to the screening monitor (bowel, breast and cervical). The current app is described in the [README](../README.md).

## The idea in one paragraph

In Finland, how early a cancer is found and how fast treatment starts depends on where you live and on how hard you push. We build one product with three pages. The **patient page** helps a person notice risk early and see whether their care is on schedule. The **hospital page** shows staff which patients are falling behind and why. The **county page** shows decision-makers where the county loses people and what to do about it. Dates that patients choose to share fill a real hole: Finland publishes no figures on how long cancer patients wait from referral to treatment.

## Which cancers we cover

Goal 3 of the National Cancer Strategy 2026–2035 names three cancers for better survival: lung, pancreas and liver. We cover all three, plus bowel cancer.

| Cancer | Where it appears | Why |
|---|---|---|
| **Lung** | Every page, as the deep example | Goal 3 cancer (survival target +14 percentage points), usually found late, and the only one with a free published risk model |
| **Bowel** | Second full story: patient reminder, county page, screening analysis | The only cancer where a new screening programme (started 2022) can be followed town by town |
| **Pancreas, liver** | County page only | Goal 3 cancers, but no screening test or usable risk model. They are rare, so we pool several years and show uncertainty ranges |
| **Breast, cervical** | Only in the detection radar (3.1) and "who misses screening" (3.2) | Long screening history by town |

The symptom diary, pathway clock and hospital page work for any cancer.

---

## Page 1: Patient

### 1.1 Symptom diary
- **Who it's for:** someone who feels unwell but hasn't seen a doctor yet.
- **What it does:** a chat asks about symptoms and saves them with dates. The person comes back over days or weeks and adds to it.
- **Example:** "Cough since 2 October. Lost 4 kg. Smoked a pack a day for 30 years."
- **Output:** a one-page summary the person can show at the appointment or share with their health centre in one tap.
- **Limits:** it never gives a diagnosis. The strongest thing it says is "these symptoms should be checked by a doctor within two weeks."
- **Why it's not Omaolo:** Omaolo (the national symptom checker) asks about one symptom in one sitting and ends at "book an appointment." Ours keeps a record over time and continues after the appointment.

### 1.2 Screening nudge (Yaokai)
- **What it does:** the patient side of the detection radar (3.1). The person answers a few questions and the app tells them whether to go for a screening or see a doctor.
- **The person never sees a score.** They only see the next step, for example: "Lung screening would be worth discussing with a doctor."
- Details are in 3.1.

### 1.3 Pathway clock (Yaokai, Max)
- **What it does:** the person enters dates as things happen: first doctor visit, referral, scan, diagnosis, treatment start. The app shows a timeline.
- **It shows three things:**
  1. Where they are now.
  2. The next one or two steps and what to expect, so there are no surprises.
  3. Whether they are on schedule, compared with the national target times.
- **Example:** "Your referral was sent 14 days ago. The target is 7 days. You are overdue."
- **When overdue:** it says who to contact and drafts the message for them.

### 1.4 "What's getting in the way?" (Hazel)
- **What it does:** when a step is late, the app gently asks why. Options include: no word from the hospital, can't get transport, can't afford it, too unwell, scared.
- **Why it matters:** a delay caused by the hospital needs a different fix from a delay caused by the patient's situation. For the second kind, the app points to social support.

### 1.5 Languages (Max)
- Everything on the patient page works in Finnish, Swedish and English. People who struggle with Finnish are among those who miss care today.

### 1.6 Caring check-ins (Hazel)
- **What it does:** the app doesn't wait for the person to come back. It reaches out and asks how they are, in a warm tone, and adds the answers to the symptom diary.
- **Who gets more check-ins:** people the detection radar (3.1) flags as high risk, or who logged a worrying symptom. They are asked more often than others.
- **Example:** "Hi, two weeks ago you mentioned a cough. Is it still there? Has anything changed?"
- **Limits:** the person must switch check-ins on and can switch them off. The app only uses what the person has told it, never registers.

---

## Page 2: Hospital

### 2.1 Off-track list (Yaokai)
- **What it does:** a list of patients whose care is behind schedule, worst first.
- **Each row shows:** the step they are stuck at, days overdue, and the reason from 1.4.
- **Example row:** "Patient 12 · waiting for CT scan · 9 days overdue · reason: no contact from hospital."

### 2.2 Automatic escalation (Yaokai)
- **What it does:** when a patient passes a set number of days overdue, the case is flagged to a named coordinator without the patient having to call.
- **Why it matters:** today the people who chase get seen first. This protects the ones who don't.

### 2.3 Shared symptom records (Hazel)
- **What it does:** when a patient shares their symptom diary and risk score, the clinician sees it before the appointment.

### 2.4 Where the delays pile up
- **What it does:** a simple count of which step causes the most overdue cases (for example scans, lab results, or the treatment-planning meeting).

**Honest note for the pitch:** the demo patients are made up. We generate them from each county's real case numbers so the load looks realistic. Real use would need a link to hospital systems.

---

## Page 3: County

### 3.1 Detection radar (Yaokai)
One engine at two levels: it finds people at high risk and suggests screening, and it shows each county where people fall through.

**For people: find high risk, suggest screening**
- **What it does:** estimates a person's risk for each cancer from what they enter, and suggests a screening or a doctor visit when the risk is high.
- **Inputs:** age, sex, smoking (years and cigarettes per day), alcohol, weight, family history, and symptoms from the diary (1.1).
- **Models:**
  - **Lung:** PLCOm2012, a published model that gives the chance of lung cancer in the next six years.
  - **Bowel, breast, cervical:** no free published model exists. We combine Finnish Cancer Registry rates by age and sex with risk ratios from published studies. This is labelled **Estimate**, not a clinical score. Invitation ages for the national screening programmes are public rules, so the app also checks whether the person is due and whether they took part.
- **What the person sees:** only the suggested next step, never the score. For example: "You are in the age group for bowel screening. If you haven't sent back your test kit, please do." Or: "Lung screening would be worth discussing with a doctor."
- **Who sees the score:** the clinician, only if the person chooses to share it (2.3), with the Estimate label where it applies.
- **Why it's legal today:** Finnish law stops authorities using registers to pick people for screening. It doesn't stop a person entering their own details.
- **The longer story:** a law change is planned for 2027–2030. After that, the same engine could run on register data and send invitations automatically.

**For counties: where people fall through**
- **What it does:** a map of the 21 wellbeing services counties, with a drill-down to towns. For each, it follows people along the path and marks the step where the most are lost:
  1. **At risk:** how many high-risk people live there, from population by age (Statistics Finland) × smoking, alcohol and obesity rates (THL Sotkanet).
  2. **Screened:** how many invited people took part. Turnout differs a lot: in 2024, bowel screening ranged from 59.5% to 82.4% across 292 towns, breast from 68.1% to 92.5%, and cervical from 45.7% to 92.3% (THL Sotkanet 6103, 3621, 3620).
  3. **Found late:** how many cancers the county should expect given its risk factors and age, compared with how many were found and at what stage.
  4. **Survival:** official survival figures only exist for 5 large regions. For counties we use deaths divided by new cases. If a county has 100 new lung cancers and 90 lung cancer deaths a year, few people survive there.
- **Output:** for each county, its high-risk count and its weakest step, which feed the action brief (3.5).

### 3.2 Who misses screening (Yaokai)
- **What it does:** for each town, we predict screening turnout from its income, age and language mix, then compare with the real turnout.
- **Output:** towns doing much worse than predicted need help. Towns doing much better are doing something worth copying.

### 3.3 Overload warning (Yaokai)
- **What it does:** Finland is ageing, and cancer rises fastest in people over 75. We combine population forecasts with cancer rates to predict each county's cases up to 2035, and flag counties whose waiting lists are already growing.

### 3.4 Missing-data map and starter plan (Max)
- **What it does:** shows clearly what Finland doesn't measure. The biggest gap: no public figures on cancer waiting times, although Goal 3 has a target for them.
- **Output:** a short plan telling a county which three dates to start recording first: referral received, diagnosis, treatment start.
- **The link to page 1:** these are the same dates patients enter in the pathway clock. Patients who opt in fill the gap from the bottom up.

### 3.5 County action brief
- **What it does:** click a county and get one page: its biggest gap, the step in the care pathway where it happens, and three ranked actions.
- **Why:** a decision-maker should get the message in two minutes.

---

## On every page

### Source badges (Max)
Every number has a badge you can click. It shows where the number came from and one of three labels:
- **Direct data** – taken straight from an official source.
- **Estimate** – we calculated it, and we show how.
- **Data gap** – nobody publishes this.

Insights from AstraZeneca mentors get their own source type, "mentor interview."

### Privacy by design (Max)
- Patients enter their own data.
- Sharing with a hospital or for statistics is opt-in, each time.
- Only county totals are used for the county page, never individual records.
- We say "designed around GDPR principles." We don't say "GDPR compliant," because nobody has audited it.

---

## Where the data comes from

| Feature | Source |
|---|---|
| Cancer cases, deaths, stage at diagnosis, by county | Finnish Cancer Registry statistics (CSV download) |
| Cancer deaths by county, 1969–2025 | Statistics Finland (open API) |
| Screening turnout: cervical, breast, bowel | THL Sotkanet (open API, indicators 3620, 3621, 6103) |
| Smoking, alcohol, obesity, inactivity by county | THL Sotkanet (4404, 4411, 4459, 5527) |
| Waiting lists for specialist care | THL Sotkanet (3336) and THL Sampo |
| Population, age, income, education, forecasts | Statistics Finland (open API; projection by age and area 2024–2045, table 14wx) |
| Screening positivity and detection rates | Finnish Cancer Registry screening statistics |
| Nordic survival comparison | NORDCAN |
| Lung risk model | PLCOm2012, published in NEJM 2013 |
| Target times for cancer care | THL guidance 21/2016 |

Details and links are in `astrazeneca-data-sources.md`.

---

## Set aside for now

- **What-if simulator** (Max): good idea, but we lack sourced figures for most sliders.
- **Workforce strain monitor** (Max): we haven't found county workforce data. The ageing part lives on in 3.3.
- **Automatic hospital transfer applications** (Hazel): needs access to hospital systems.
- **Training our own risk models** (Hazel): no individual-level data is available in 48 hours, so we use a published model.

## Still to check before the pitch

1. The exact target times in THL guidance 21/2016. The pathway clock depends on them.
2. Omaolo's current list of symptom checkers, to be sure it has no cancer one.
3. Lung, pancreas and liver survival figures from NORDCAN (Finland vs Sweden and Norway).
4. The "Goal 3.4 / 3.5" numbering in the strategy.
5. Questions for the AstraZeneca mentors, Friday 20:00.

## If time runs short

Build in this order:
1. Pathway clock and off-track list (the core story).
2. Detection radar (person side) and symptom diary.
3. Detection radar (county side) and action brief on one screen.
4. Everything else on the county page.
