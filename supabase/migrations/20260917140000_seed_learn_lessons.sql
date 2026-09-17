-- Starter Learn lessons (insert by title if missing)
insert into public.educational_content (title, category, level, summary, content, read_time)
select v.title, v.category, v.level, v.summary, v.content, v.read_time
from (values
  ('What is a stock?', 'basics', 'beginner',
   'A simple introduction to owning a share of a company.',
   'A stock (or share) represents a small ownership stake in a company. When you buy shares, you own a slice of that business. Prices move as buyers and sellers agree on value — they can rise or fall. On SureInvest you practise with simulated money only; no real shares are bought or sold.',
   4::numeric),
  ('Understanding diversification', 'strategies', 'beginner',
   'Why spreading investments can reduce risk.',
   'Diversification means not putting everything into one company or sector. Holding a mix of local and global assets, and different industries, can smooth returns when one area struggles. It does not remove risk, but it avoids depending on a single outcome.',
   5::numeric),
  ('How dividends work', 'basics', 'beginner',
   'How some companies return cash to shareholders.',
   'A dividend is a payment a company may make to shareholders from profits. Dividends are not guaranteed — companies can raise, cut, or stop them. Yield is the annual dividend relative to the share price; a high yield alone is not a reason to buy.',
   4::numeric),
  ('Investing on the Botswana Stock Exchange', 'markets', 'beginner',
   'What the BSE is and how local listings fit a practice portfolio.',
   'The Botswana Stock Exchange (BSE) is where many Botswana companies list their shares. Local names can be familiar and denominated in Pula (BWP). On SureInvest, BSE prices are refreshed when Mansa data is configured. Practise sizing positions carefully — local markets can be less liquid than large global exchanges.',
   5::numeric),
  ('Demo vs real accounts', 'tools', 'beginner',
   'How SureInvest separates practice money from a future real account space.',
   'Your Demo account uses virtual cash so you can explore markets, goals, and Auto-Invest without real money. The Real account space is reserved for later; trading there is not enabled yet. Switch accounts from the top bar — balances and holdings never mix between the two spaces.',
   3::numeric),
  ('Goals and Auto-Invest', 'strategies', 'beginner',
   'Use goals and recurring plans to build habits.',
   'Goals help you name a target (for example education or an emergency fund) and track progress. Auto-Invest can schedule recurring simulated purchases into a chosen security. Both features run only in Demo mode today. Consistency matters more than perfect timing when you are learning.',
   4::numeric)
) as v(title, category, level, summary, content, read_time)
where not exists (
  select 1 from public.educational_content e where e.title = v.title
);
