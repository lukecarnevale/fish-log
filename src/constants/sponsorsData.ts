// constants/sponsorsData.ts
//
// Sponsor data for the Footer component.
// Extracted for readability and easier maintenance.
//

export interface Sponsor {
  id: string;
  name: string;
  icon: string;
  website: string;
}

export const SPONSORS: Sponsor[] = [
  {
    id: 'ae14392d-89ee-414c-8d23-8bb2e377d9e7',
    name: 'Sea Tow',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSugeDjI5I1D2Jb_AA1IT2MtQmPVaFxMOqjpw&s',
    website: 'https://www.seatow.com',
  },
  {
    id: '39b8b339-df87-4a9d-aa49-25e3d83b029c',
    name: 'BoatUS',
    icon: 'https://play-lh.googleusercontent.com/Rzmm-rbPNmiFM2r4Z7yBvCurvsFAkZ5IQTbsw8M_5n7Pmgk0VhDTUbiOlAgGnm6gO7rH',
    website: 'https://www.boatus.com/towing',
  },
  {
    id: '2c529a32-3789-4564-9709-418ae870a356',
    name: 'The Qualified Captain',
    icon: 'https://thequalifiedcaptain.com/cdn/shop/files/TQC_Logo_TQC.png?v=1696538834&width=600',
    website: 'https://www.thequalifiedcaptain.com',
  },
  {
    id: '69137556-95d0-417e-8ec0-436c14006bfb',
    name: 'NC Wildlife',
    icon: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Logo_of_the_North_Carolina_Wildlife_Resources_Commission.png',
    website: 'https://www.ncwildlife.org',
  },
  {
    id: '042bc821-af35-458d-8fd9-740e05253b73',
    name: 'Intracoastal Angler',
    icon: 'https://cdn.shopify.com/s/files/1/0563/7124/9361/t/1/assets/IASO_P_White.png?v=1629906044',
    website: 'https://www.intracoastalangler.com',
  },
];
