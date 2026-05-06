# Colosseum Method Note

> A human-moderated, multi-model design chamber for complex sociotechnical system design.

> The best output of a Colosseum session is not an answer. It is a better decision.

## 1. What the Colosseum Method Is

The Colosseum Method is a structured ideation and design-refinement practice in which a human moderator brings a live design tension into dialogue with two or more AI collaborators. The aim is not to outsource thinking, automate design decisions or generate consensus. The aim is to create disciplined friction around a problem that spans multiple registers: technical architecture, research framing, interaction design, ethics, implementation risk and user experience.

In a Colosseum session, the human introduces an intuition, question, uncertainty or architectural tension. One model may extend and structure the idea, while another may challenge, reframe or stress-test it. The human then decides what survives. The value of the method lies in the loop: articulation, critique, synthesis, moderation and decision.

The method works best when the input is neither too vague nor too narrow. A broad prompt such as “help me design a bot” is too open. A narrow prompt such as “write this class” is too implementation-specific. The most productive input is a live design tension: specific enough to create pressure, but open enough to require judgement.

A weak Colosseum input might be:

> Help me design a museum bot.

A stronger input would be:

> How should a Furhat-based museum bot remain expressive and engaging while ensuring that all factual claims remain grounded in a knowledge graph?

Another strong input would be:

> How should the orchestration layer consume retrieval results without letting the KG backend leak presentation logic into Furhat, while still preserving evidence status, uncertainty and narrative momentum?

These prompts create space for architectural reasoning while remaining grounded enough to produce decisions.

## 2. Why It Is Useful

The Colosseum Method is especially useful for interdisciplinary AI systems where decisions carry consequences across several layers. In the Echo project, a single design choice often affected the research contribution, the engineering architecture and the interaction experience at the same time.

For example, the question of whether the MER system should influence Echo’s behaviour was not only a technical integration question. It was also an epistemic boundary question and a visitor-experience question. The resulting principle was that MER and ambient signals may shape delivery, pacing, warmth and interaction density, but they must not influence factual claims. This decision protects both the architecture and the research identity of the system.

Similarly, the question of whether Furhat should own intent resolution became a broader architectural boundary: Furhat may handle local interaction intents such as repeat, stop, yes, no and tell me more, while KG-domain interpretation remains outside the robot in the Echo service. This prevents the embodied interaction layer from becoming an uninspectable second reasoning system.

The method is useful because it slows down premature closure. A design idea that feels settled after one pass may still contain hidden seams. A second model can expose those seams by asking: what happens when this fails, where does this responsibility live, what does this decision imply later and what should not be overbuilt yet?

## 3. Roles in the Method

The human moderator is the domain owner. They bring the context, constraints, values, priorities and final judgement. The models provide articulation, alternatives, critique and pressure, but they do not own the decision.

This asymmetry is essential. Without human domain ownership, the process becomes ordinary AI brainstorming. With it, the process becomes closer to a structured design review: the models act as available reviewers with different habits of thought, while the human decides which arguments matter.

The moderator’s responsibilities include:

- introducing a clear design tension
- preserving scope when the discussion becomes too broad
- identifying when a point is only interesting versus actually useful
- asking for pushback when both models converge too quickly
- deciding which outputs become architecture, documentation or future questions
- stopping the discussion when it has produced a usable decision

In practice, the moderator may also label the mode of the session. For example: “I am brain dumping,” “let’s not build yet,” “keep this technical,” or “plain text only.” These interventions prevent the session from drifting into the wrong level of abstraction.

## 4. The Design Chamber Loop

A productive Colosseum session usually follows this pattern:

1. **Input tension**  
   The human introduces a concrete uncertainty, design choice or architectural boundary.

2. **First articulation**  
   One model expands the idea, gives it structure and proposes a possible framing.

3. **Second-pass critique**  
   Another model stress-tests the framing, identifies gaps, introduces missing constraints or reframes the problem.

4. **Human moderation**  
   The human accepts, rejects, redirects or sharpens the discussion.

5. **Synthesis**  
   A clearer principle, architecture, document section or build sequence emerges.

6. **Traceable output**  
   The session ends with a decision, design note, build plan, unresolved question or named future session topic.

The output matters. A Colosseum session should not only feel productive; it should leave something behind. The result may be a design brief, a technical build plan, a research question, a named architectural principle or a list of implementation milestones.

## 5. Case Example: Echo

Echo is a Furhat-based museum conversational agent designed around a British Music Experience knowledge graph. Its core principle is epistemic honesty: the knowledge graph and retrieval layer do the factual work, while Furhat handles interaction, listening, embodiment and spoken delivery.

A Colosseum session around Echo began with a loose design concern: how to make the Furhat interaction smooth, expressive and technically manageable without compromising the KG-first epistemic architecture. Through iterative discussion, several concrete outputs emerged.

The first major output was `ECHO_DESIGN_BRIEF.md`, which defines Echo as a music-nerd scholar whose enthusiasm is in service of the visitor’s curiosity. It establishes the boundary between social presence and factual authority, the role of MER and ambient signals, the importance of session-bounded memory and the principle that Echo should remember a visitor without tracking them.

The second major output was `FURHAT_ORCHESTRATION_BUILD_PLAN.md`, which translates the design identity into a technical architecture. It defines Furhat Flow as responsible for interaction phases and callbacks, while the Echo Orchestrator owns arbitration and sequencing. It also defines the package structure, action model, arbitration rules, build phases and MVP specification.

The session also produced several named principles:

- **The KG does the epistemic work.**
- **Furhat is an embodied interaction adapter, not the reasoning brain.**
- **MER may shape delivery, but never factual content.**
- **Gestures are part of the honesty interface, not decoration.**
- **Echo should amplify engagement, not fight disengagement.**
- **Echo should make the visitor feel like the most interesting person in the room.**
- **The distinction between remembering and tracking is an architectural boundary.**

These principles were not generated in isolation. They emerged through repeated rounds of proposal, critique and human selection.

## 6. What Made the Echo Session Work

The Echo session worked because the design problem had genuine tension. It was not a simple implementation task. It sat at the intersection of human-robot interaction, knowledge graph reasoning, museum experience design, audio/noise diagnostics, visitor attention and epistemic transparency.

This made it particularly suitable for Colosseum-style discussion. Each design decision had to be tested across several layers. For example, adding ambient music responsiveness could improve personability, but it also risked introducing unsupported factual claims if the bot implied it knew what music was playing. The resulting MER boundary emerged because the idea was examined socially, technically and epistemically.

The session also worked because the human moderator kept the discussion grounded. When the conversation drifted toward building too soon, the moderator narrowed it back to build choices. When the technical framework risked becoming too large, the moderator asked whether it was actually the right way forward. When personality ideas became too broad, the moderator clarified that MER should not bleed into factual content.

The method did not remove the need for judgement. It increased the amount of structured material available for judgement.

## 7. Why Convergence Is Not Always Success

A limitation of the method is that two models may converge too quickly. Agreement can indicate that a design choice is sound, but it can also indicate that neither model has offered sufficient resistance. Fast consensus is therefore not automatically a good outcome.

The moderator must actively test convergence by asking:

- What is the hidden risk?
- What would break this design?
- What are we overbuilding?
- What are we assuming too early?
- Which responsibility is in the wrong layer?
- What would this look like under implementation pressure?

The moderator’s role is not only to detect weak convergence, but also to create resistance when needed. This may involve asking one model to argue against the current design, requesting implementation consequences, forcing a boundary test, asking what would fail in a real deployment, or checking whether the decision still holds under social, ethical and technical pressure. The method is strongest when agreement is earned through stress-testing rather than accepted because it feels coherent.

In the Echo session, some of the most useful refinements emerged after a point initially seemed settled. The anticipation window, the MER boundary, the action-source model and the distinction between remembering and tracking all became clearer because the discussion was pushed one pass further.

The Colosseum Method is therefore not consensus-seeking. It is tension-seeking. The goal is not for models to agree; the goal is to expose enough structure that the human can make a better decision.

## 8. Outputs and Evidence

A successful Colosseum session should produce traceable design artefacts. These may include:

- design briefs
- technical build plans
- package structures
- implementation milestones
- architectural boundaries
- named principles
- open research questions
- decision logs
- future Colosseum prompts

For Echo, the method produced two canonical documents and a build sequence. This makes the design provenance visible. It is possible to trace why a boundary exists, what alternatives were discussed and what principle the final decision protects.

This traceability is important for research systems. It helps distinguish design reasoning from post-hoc justification. Instead of saying “we designed it this way,” the project can show the chain of reasoning that led to a design choice.

## 9. Risks and Limitations

The Colosseum Method has several risks.

First, it may create a false sense of confidence if both models converge without real critique. The moderator must deliberately request pushback and implementation consequences.

Second, it may overproduce language. A productive discussion can generate elegant principles that feel complete before they have been tested in code or practice. This is why outputs should be tied to build steps, fixtures or definitions of done.

Third, the method depends heavily on human domain ownership. If the moderator lacks enough context to judge the outputs, the process can become persuasive rather than useful.

Fourth, the method may encourage over-design. Because the discussion can rapidly produce architectures, frameworks and abstractions, the moderator must repeatedly ask what the smallest testable slice is.

Finally, the models may reinforce each other’s assumptions. The human must remain willing to interrupt, redirect or reject an appealing consensus.

## 10. When To Use It

The Colosseum Method is most useful when:

- the problem has multiple valid framings
- the decision affects both research and implementation
- the architecture has unclear boundaries
- the system involves social, ethical or interactional constraints
- premature closure would create later technical debt
- the desired output is a design decision, not just information

It is less useful for simple coding tasks, factual lookup, routine documentation or problems where the requirements are already stable.

In the Echo project, it was useful because the work involved a complex sociotechnical system. The challenge was not merely to build a Furhat bot, but to design an embodied knowledge-graph agent whose interaction behaviour, evidence discipline and visitor experience were aligned.

## 11. Future Use

A future Colosseum session is already suggested by the Echo architecture:

> How does the orchestration layer consume retrieval results without letting the KG backend leak presentation logic into Furhat, while still preserving evidence status, uncertainty and narrative momentum?

This is an ideal Colosseum prompt because it contains a real architectural tension. It is specific enough to produce concrete design decisions, but broad enough to require reasoning across system boundaries.

Other future sessions may address:

- KG retrieval result schema
- evidence-status mapping to response modes
- session-local interest modelling
- visitor-facing uncertainty language
- gesture vocabulary for epistemic states
- evaluation methodology for embodied epistemic honesty

## 12. Working Definition

The Colosseum Method is a human-moderated, multi-model design practice for complex system architecture. A live design tension is introduced into a structured dialogue between AI collaborators. Their outputs are iteratively challenged, synthesised and judged by the human domain owner. The method’s value lies not in automating design, but in producing disciplined friction, traceable reasoning and clearer architectural commitments.

The best output of a Colosseum session is not an answer. It is a better decision.