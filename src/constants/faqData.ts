// constants/faqData.ts
//
// FAQ items for the Mandatory Harvest Reporting card.
// Extracted from MandatoryHarvestCard for readability.
//

export interface FaqItem {
  question: string;
  answer: string;
}

export const MANDATORY_HARVEST_FAQS: FaqItem[] = [
  {
    question: 'What is Mandatory Harvest Reporting?',
    answer:
      'Beginning December 1, 2025, recreational anglers must report catches of red drum, flounder, spotted seatrout, striped bass, and weakfish. Commercial fishermen must also report all harvested fish regardless of sale status.',
  },
  {
    question: 'Why is Mandatory Harvest Reporting happening?',
    answer:
      'The program aims to enhance fisheries management by collecting comprehensive harvest data to supplement existing commercial trip ticket reporting and recreational survey programs.',
  },
  {
    question: 'Who has to participate?',
    answer:
      'Both recreational and commercial fishermen are impacted. Recreational anglers must report the five specified species, while commercial fishermen report personal consumption harvests through seafood dealers.',
  },
  {
    question: 'Which waters does this apply to?',
    answer:
      'Requirements apply to coastal, joint, and adjacent inland fishing waters under Marine Fisheries Commission and Wildlife Resources Commission authority.',
  },
  {
    question: 'What information must I report?',
    answer:
      'Recreational fishers report: license number (or name and zip code), harvest date, number of each species kept, harvest area, and gear type.',
  },
  {
    question: 'When must I report my harvest?',
    answer:
      'Recreational fishers should report when harvest is complete (shore/dock arrival for boats). If you lack internet connection, record information and submit electronically by midnight the following day.',
  },
  {
    question: 'Why these five fish species?',
    answer:
      'Red drum, flounder, spotted seatrout, striped bass, and weakfish are among the most targeted species in North Carolina\'s coastal and joint fishing waters.',
  },
  {
    question: 'How will the law be enforced?',
    answer:
      'Enforcement phases over three years:\n\u2022 Dec 1, 2025 \u2014 Verbal warnings\n\u2022 Dec 1, 2026 \u2014 Warning tickets\n\u2022 Dec 1, 2027 \u2014 $35 infractions plus court fees',
  },
  {
    question: 'Do charter captains report for customers?',
    answer:
      'No. The law specifies individual anglers bear reporting responsibility at trip completion. Captains can obtain QR code stickers by contacting the Mandatory Harvest Reporting Team.',
  },
];

export const FULL_FAQ_URL =
  'https://www.deq.nc.gov/about/divisions/marine-fisheries/science-and-statistics/mandatory-harvest-reporting/mandatory-harvest-reporting-faqs';
