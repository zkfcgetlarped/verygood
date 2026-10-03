<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All balance changes go through server functions calling the `adjust_balance` SQL function with the admin client; players have read-only access to their own rows. Why: prevents clients from minting money.
- The in-game bot talks to `/api/public/bot/*` with `Authorization: Bearer $BOT_API_SECRET`. Why: the only way money enters or leaves the site.
