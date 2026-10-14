# Trivia question data

The question bank in `trivia-bank.ts` are from [Open Trivia DB](https://opentdb.com/), retrieved October 14, 2026 using its public API. Open Trivia DB contributors created the questions and supplied answers. Most questions are user-contributed questions, not independently fact-checked by House Rules.

The source publishes this data under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/). This license applies to the imported question data and adaptations, not to unrelated application code. Source: [API documentation and licensing](https://opentdb.com/api_config.php).

Changes: replaced seven dated or law-related questions with other source questions, decoded Base64 text, selected 100 questions for each of ten categories, assigned local IDs, combined correct and incorrect answer choices, and preserved difficulty. Version 0.10 replaces general-3 (the Battle Cats/Moneko question) with an original general-knowledge question about the Equator, retaining 1,000 questions and 100 per category. Gameplay shuffles question and choice order. The bundled data works offline. When redistributing or adapting this data, retain attribution, link the license, indicate changes, and share adaptations under the same license.
