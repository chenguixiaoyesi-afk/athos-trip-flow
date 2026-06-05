## ⚠ REPOSITORY ISOLATION RULE（全 Agent 共通・最優先）

This repository is **Athos TravelMate only**. Design / Implementation / Review Agents may reference **only** this repository, this working directory, `.claude-team/` files, `src/HANDOFF.md`, and this `README.md`.

**Forbidden references**: other repositories / past projects / `order-system` / `proxyhub-platform` / 代理店プラットフォーム / 補助金システム / `Priority9` / HQ・Agency・Sales structure / `viewAs` structure.

If any premise inconsistent with the current codebase is detected, the Agent must immediately stop and output:

```
FOREIGN CONTEXT DETECTED

出典: ...
検出箇所: ...
不一致内容: ...
```

- Implementation Agent: must NOT make any code changes.
- Review Agent: must output `REJECTED / FOREIGN CONTEXT DETECTED` and must NOT declare `PHASE COMPLETE`.
- Design Agent: may issue a new Design Handoff only after the cause is removed.

Authoritative source: `.claude-team/goal.md` §0.

---

**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
