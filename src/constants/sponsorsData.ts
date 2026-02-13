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
    id: 'seatow',
    name: 'Sea Tow',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSugeDjI5I1D2Jb_AA1IT2MtQmPVaFxMOqjpw&s',
    website: 'https://www.seatow.com',
  },
  {
    id: 'towboatus',
    name: 'TowBoatUS',
    icon: 'https://play-lh.googleusercontent.com/Rzmm-rbPNmiFM2r4Z7yBvCurvsFAkZ5IQTbsw8M_5n7Pmgk0VhDTUbiOlAgGnm6gO7rH',
    website: 'https://www.boatus.com/towing',
  },
  {
    id: 'qualifiedcaptain',
    name: 'The Qualified Captain',
    icon: 'https://thequalifiedcaptain.com/cdn/shop/files/TQC_Logo_TQC.png?v=1696538834&width=600',
    website: 'https://www.thequalifiedcaptain.com',
  },
  {
    id: 'ncwildlife',
    name: 'NC Wildlife',
    icon: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Logo_of_the_North_Carolina_Wildlife_Resources_Commission.png',
    website: 'https://www.ncwildlife.org',
  },
  {
    id: 'biggersmarket',
    name: 'Biggers Market',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSS57_0_nBQ6DV4JkMHWk0-LiNg6m2w3p_-pg&s',
    website: 'https://www.biggersmarket.com',
  },
  {
    id: 'intracoastalangler',
    name: 'Intracoastal Angler',
    icon: 'https://cdn.shopify.com/s/files/1/0563/7124/9361/t/1/assets/IASO_P_White.png?v=1629906044',
    website: 'https://www.intracoastalangler.com',
  },
];
