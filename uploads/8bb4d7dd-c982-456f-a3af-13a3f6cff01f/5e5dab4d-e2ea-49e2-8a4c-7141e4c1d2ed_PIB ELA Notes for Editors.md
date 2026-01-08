# STYLE AND FORMATTING (from Notes for Editors)

## **K-2 (Misc)**

- In K-2, slashes used to break syllables do not have spaces. **Update from Content, 9/4/24: I'm 99.9% certain that we only use slashes for the Audio scripts and to indicate sounds in the metadata, so this shouldn't be something readers see at all.**
- Per Content via email, 10.21.24, and added to eStyle:
  - K and G1 items DO NOT HAVE lettered options for any item type, and there are three options in every item.
  - G2 items DO NOT HAVE lettered options for standalone items but DO HAVE lettered options for items written to passages, and there are four options in every item.
- In K-2, paragraph/line references are not included in the options.
- In K-2, don't include "from" in items when referencing the title of an excerpt.
- In K-2, titles are in quotations, even when it's a book title. And we avoid using words to refer to nonfiction texts in stems. So instead of using "article" or something similar, you'll see something like this: In "How to Catch a Fish," what is used for bait?
- Avoid open stems at K-2.
- In K standalone items, if options are fragments, they are lowercase.
- In K items with audio, there should be a hard return after the audio so that the text doesn't butt against the audio player.
- In K-2, boldfacing key words to emphasize them is fine.
- In K standalones, tested words are in boldface. In K passage items, though, tested words are underlined (per eStyle), but the tested word in the running text in stem is lowercased if capped in passage.

## **Alt Text**

- To see the alt text for an image, hover over the image with your mouse. If nothing comes up, the alt text is missing. Note that in the log. If you see any issues with the alt text in any of our new development work, feel free to comment on it, including if you see any cluing issues with items.
- Intended to be a bare-bones, neutral description of the art and should not be worded in a way that would give an advantage to a student using it; e.g., few adjectives, adverbs, or subjective wording. Alt text is an accessibility tool, not an accommodation.
- Do not include quotation marks.
- A comma is usually used to indicate a pause between things like the word "titled" and the title that follows. For example: "A bar timeline titled, Milestones in U.S. History." or "The caption reads, A seahorse."

## **Answer Options in Text-Support Items**

- See eStyle entries for text-support items.
- Since PIB does not use quotation marks with single-word quotations in options, if an option has two single-word quotations, format with no quotation marks and with a comma between the words: Contract, dog (Option order should be in order of appearance in paragraph by first word only.)

## **Authorial Stems**

- When we ask about author's point of view, opinion, perspective, etc., OR when we ask why the author includes/structures a certain sentence, phrase, word, etc., we use present tense. Examples:

  - "Which point of view does the author emphasize in the article?"

  - "Throughout the article, the author conveys the perspective that"

  - "Why does the author of "To Drill or Not to Drill" present both sides of the argument?"

  - "In paragraph 10 of the article, the author best reveals her point of view"

## **Box Text Multi**

- A \<br /> character should appear before a stem after boxed text around multiple paragraphs e.g.

```xml
<p>Read paragraphs 1 and 2.</p>

<div class="boxText">

<p>Boxed text paragraph 1</p>

<p>Boxed text paragraph 2</p>

</div>

<br />

<p>Stem</p>
```

- Indents should NOT be used in boxed text, even if the full paragraph (or multiple paragraphs) are quoted. The leading between paragraphs is sufficient.

## **Dictionary Items**

- See eStyle for formatting. To get the text box to indent, highlight the text inside the box and select the indent button (next to the special characters). In ABBI, the text will look indented inside the box, but in TN8 preview, the whole box will look indented below the stem. Source code should read:

  ```xml
  <p class="boxText" >
  ```

## **Direction Lines**

- G3-HS: Item DLs are run in with stems.
- Kindergarten MC, G1 MC, and K-2 TEIs have a DL on its own line below the stem. See eStyle for correct wording.
- **DO use a direction line for Grade 1 plain MC items, contra eStyle.** Per Annie Guillen, 10/25/2024: "My thinking is that first graders are still pretty young, and again, not all kids went to or are required to go to kindergarten. While a majority of students do go to kindergarten, it is only mandatory in 19 states. I feel pretty strongly that we should at least consider that in test design. When learning skills, students usually come across commands rather than questions. That is the rationale there to include a direction line rather than a question in kindergarten as well as first grade. However, remember that is a test design decision. Because we cannot guarantee that students were exposed to any sort of assessments in kindergarten, we need to ensure that first graders are being assessed on the standard and not on testing strategies or testing familiarity. That is just my two cents. 🙂" Per JW: "We'll keep using this additional DL to provide extra support for first graders."

## **Dragger Placement**

- Grades 1-HS: The draggers should appear above the drop bay(s).
- Kindergarten: Choices (draggers) should be placed in the location that makes the most sense for the item.

## **Gap Match Items**

- Stem should be a question/command and a separate DL
- For the lower grades, "Which words best complete the sentence? Move the correct answer into each box. Not all answers will be used." is acceptable.
- (If only one gap, "Not all answers will be used." is not needed. "Not all answers will be used" is more for GM items where you have multiple drop bays and more draggers than drop bays.)
- A box should appear around the sentence in gap-match items, such as this:

```xml
<p class="boxText">text before \[gap\] text after\</p>
```

## **Gap Match - Table Items**

- All entries in tables should be centered. The headers will be centered/boldface automatically.

## **Hot Text Items**

- Hot text *standalone* items should not have "from the story/paragraph/etc." in stem.
- If ACs in a hot text item are phrases (not full sentences), or a mix, *do not* include the punctuation in the hot text. If all ACs are full sentences, *do* include the punctuation.
- If a hot text box includes one full paragraph or more than one paragraph, no paragraph numbers or indents are added. The paragraphs are separated by leading (using `<p>` tags).
- All HTX items should use either the DL "Select the correct answer." or "Select (**number**) correct answers." only. NOTE: K-2 uses "Choose," not "Select."
- The CA number, when present, should not be in the stem, only in DL.

## **Inline Choice Items**

- Words as words in inline choice items do not take quotation marks. The drop-down menu itself is sufficient to set the word apart (e.g., In paragraph 3, the word "example" means \[DDM: tested word with no quotation marks\].)
- DL only. There is no separate stem.
- DD options should be ordered by length.

## **Inline Choice Items with Culled Text**

TEXT ELEMENT:

DL for the culled text ("Read this sentence from . . ."), if applicable. (SA do not have this line.)

Boxed text, if applicable

DL for the IC ("Complete the sentence(s). . . .")

INLINE CHOICE ELEMENT: ONLY the IC sentence(s) containing DDs.

## **Match Items**

- The number, when applicable, should be in the stem, not in the DL.
- The number should be bold, lowercase, and spelled out, not a numeral.

## **Match Table Grids**

- All entries in match table-grid tables should be centered. Headers should be centered and not bolded.
- Column 1 should have a header as well.
- When a title is a column header: (1) For complete works, use quotation marks. (2) For excerpts, use "from" (not "Excerpt from" or "excerpt from") and style the actual title in italics or with quotation marks, as appropriate.

## **Multiselect items**

- The number of CAs should be in the DL that follows the stem, not the stem itself. "Which details from the story . . . ? Select **two** correct answers."
- For ESBRs (two-part items), see eStyle entry for **directions, parted items**.

## **Paired Passages, Item References**

- Every item should reference the name of the passage it is testing.
- If the item is referencing both passages, we only need both names to appear once. All subsequent references in the item can be changed to a general term: "stories," "the poem and the story," etc.

## **Paragraph ranges, line ranges, sentence ranges, etc.**

- In stems, use "and" for a range of only two ("paragraphs 4 and 5") and an en dash for a range of more than two ("paragraphs 4–7").
- In parentheticals, use the en dash for *any* range: "(paragraphs 4–5)."
- This rule applies to ranges of paragraphs, sentences, lines, and stanzas.

## **Part Item Labels**

- Part labels should be in their own elements with the "Item Part Label" style applied.

## **Passage Titles**

- **NEW, 12/4/24:** For passage titles, subheadings, section headings and so forth, use *Chicago Manual of Style* (18th Edition) and⚠️ ***uppercase prepositions of five or more letters***. ⚠️

## **Passage Subheadings/Section Headings**

- These should be headline-style capped per CMOS. If the passage is permissioned, this is a permissible change per LF.

## **Poems**

- Add a space before the credit line.

## **Response Interactions/ECRs/SCRs**

- Spell check button should NOT be enabled
- Max allowed characters should be unlimited
- Text box height should be medium ***BUT for writing ECRs (the batch name will include "ECR") it should be 734 px/26 lines of text.***

## **Rubrics for TEI (Technologically Enhanced Items), such as Match Table Grids, Gap Match, etc.**

- PIB does not have rubrics. A doc showing the answers is created and attached in ABBI before Initial Review and is updated by AS each time the item is touched.

## **Subheadings/Section titles**

- Subheadings are boldface only. No heading tags.
- When an all-cap section title is used in an item, apply headline capping.
- When section titles appear in options without other text, they do not take quotation marks.

## **Subtitles**

- Do not include the subtitle when using the title in a stem.

## **Syllabication**

- Per Content, 10/25/2024: Use slashes (no space on either side of the virgule(s)) to divide syllables for K-2. From Annie Guillen: "The rationale is that while yes, black dots separate syllables in a dictionary, children are generally taught to make slashes not dots. G1 students are still pretty young (6 and 7 years old) so consistency is important in that grade. Also, keep in mind that there are (still) a handful of states that don't require kindergarten, or kindergarten is only half-day, so those students may not have the ability to adjust to seeing it a different way yet. While dictionaries are still used and available, it isn't a high priority to teach dictionary skills. I think the items should closely align with student experience for K-1 as much as reasonably possible."

## **Tables**

- All entries in non-art non-interactive (non-TEI) tables should be centered. Titles should be bolded. The headers will be centered/boldface automatically because of table coding.
- NOTE: for TEI tables, Match-Table Grid headers will not be bold, and Gap Match Table headers **will** be bold. It's an ABBI thing.

## **Writing Prompts**

- The intro sentence to the bulleted listed should be a complete sentence. "Be sure your \_\_\_\_\_\_ is complete:"
- Bullets should be command sentences with caps and periods.
- The DL should be bold. The DL should not start with "Now."
- In the formatting of the Extended Text section, box height should be "Medium."
