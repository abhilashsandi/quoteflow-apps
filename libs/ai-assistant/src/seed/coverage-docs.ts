import type { KnowledgeDoc } from '../lib/types.js';

/**
 * A small, static set of coverage-explainer documents for the assistant's RAG index. Real
 * content a carrier would maintain in a CMS — hardcoded here since this is a portfolio sample,
 * not a production knowledge base.
 */
export const COVERAGE_DOCS: KnowledgeDoc[] = [
  {
    id: 'comprehensive-vs-collision',
    title: 'Comprehensive vs. Collision Coverage',
    content:
      "Collision coverage pays to repair or replace your car after an accident with another vehicle or object, regardless of fault. Comprehensive coverage pays for damage from events other than a collision — theft, vandalism, fire, falling objects, hail, and hitting an animal. Both are optional unless required by a lender, and both apply only up to your vehicle's actual cash value minus your deductible.",
  },
  {
    id: 'liability-coverage',
    title: 'Liability Coverage',
    content:
      "Liability coverage pays for the other party's injuries or property damage when you're at fault in an accident. It's split into bodily injury liability (medical bills, lost wages, legal fees for the other party) and property damage liability (repairs to their vehicle or property). Most states require a minimum amount of liability coverage to legally drive.",
  },
  {
    id: 'deductibles',
    title: 'How Deductibles Work',
    content:
      'A deductible is the amount you pay out of pocket before your insurance covers the rest of a claim. Choosing a higher deductible (e.g. $1,000 instead of $500) lowers your monthly premium but means you pay more if you file a claim. Deductibles typically apply to comprehensive and collision coverage, not liability.',
  },
  {
    id: 'sr22',
    title: 'What an SR-22 Is',
    content:
      "An SR-22 is not insurance itself — it's a certificate your insurer files with the state confirming you carry the state-required minimum liability coverage. States typically require an SR-22 after a serious violation like a DUI, driving without insurance, or too many at-fault accidents. It usually must stay on file for 3 years, and letting your policy lapse during that period can suspend your license.",
  },
  {
    id: 'uninsured-motorist',
    title: 'Uninsured/Underinsured Motorist Coverage',
    content:
      "Uninsured motorist coverage pays for your injuries (and in some states, property damage) when the at-fault driver has no insurance at all. Underinsured motorist coverage covers the gap when the at-fault driver's liability limits aren't enough to cover your costs. Many states require or default to offering this coverage because a meaningful share of drivers on the road carry no insurance.",
  },
  {
    id: 'premium-factors',
    title: "What Affects a Quote's Premium",
    content:
      "Acme prices an auto quote using the driver's age, marital status, and driving record (including violations pulled from the MVR report), plus the vehicle's make, model, and year. A clean driving record and fewer violations lower the premium; recent at-fault accidents or moving violations raise it. Bundling home and auto, or insuring multiple vehicles, can also reduce the per-vehicle rate.",
  },
];
