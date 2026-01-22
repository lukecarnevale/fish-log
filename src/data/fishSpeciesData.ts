// data/fishSpeciesData.ts
import { EnhancedFishSpecies } from '../types/fishSpecies';

// Sample enhanced fish species data inspired by FishRules app
const fishSpeciesData: EnhancedFishSpecies[] = [
  {
    id: "1",
    name: "Red Drum",
    commonNames: ["Channel Bass", "Redfish", "Puppy Drum"],
    scientificName: "Sciaenops ocellatus",
    images: {
      primary: "https://files.nc.gov/deq/images/2021-10/Sciaenops-ocellatus.jpg?VersionId=rkuHfn9AtVZHZWrAPBhoyOOcD0tVipFH",
      additional: [
        "https://www.ncwildlife.org/portals/0/Fishing/documents/Red-Drum_NCWRC_duane-raver.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/5/59/Red_drum.jpg"
      ]
    },
    description: "The red drum, or channel bass, is North Carolina's state saltwater fish. Red drum are iridescent silvery-gray overall with a coppery cast that appears darker on the back and upper sides.",
    identification: "They have an inferior mouth, no barbels on the chin and one or more black ocellated spots on the upper side near the base of the tail. Sometimes they have multiple spots.",
    maxSize: "Up to 60 inches and 90+ pounds",
    habitat: "Found in coastal and estuarine waters from Massachusetts to Key West, Fla., and in the Gulf of Mexico.",
    distribution: "Atlantic coast from Massachusetts to Florida and Gulf of Mexico. Most common in North Carolina, South Carolina, and Gulf states.",
    regulations: {
      sizeLimit: {
        min: 18,
        max: 27,
        unit: 'in',
        notes: "Slot limit: fish must be between 18-27 inches"
      },
      bagLimit: 1,
      openSeasons: null, // open year-round
      specialRegulations: ["Only one fish may be longer than 27 inches per person per day"]
    },
    conservationStatus: "Least Concern",
    fishingTips: {
      techniques: ["Surf fishing", "Sight casting", "Bottom fishing", "Fly fishing"],
      baits: ["Live mullet", "Live shrimp", "Cut menhaden", "Scented soft plastics"],
      equipment: ["7-9 ft medium to heavy rod", "20-30 lb test line", "3/0 to 5/0 circle hooks"],
      locations: ["Inlets", "Estuaries", "Outer Banks", "Marshes", "Oyster beds"]
    },
    categories: {
      type: ["Saltwater", "Brackish"],
      group: ["Drum"]
    },
    seasons: {
      spring: true,
      summer: true,
      fall: true,
      winter: false,
    },
    similarSpecies: [
      {
        id: "5",
        name: "Black Drum",
        differentiatingFeatures: "Black drum has multiple chin barbels and vertical black bars that fade with age"
      }
    ]
  },
  {
    id: "2",
    name: "Southern Flounder",
    commonNames: ["Flounder", "Left-eyed Flounder"],
    scientificName: "Paralichthys lethostigma",
    images: {
      primary: "https://files.nc.gov/ncdeq/Marine-Fisheries/species-information/flounder/Paralichthys-lethostigma-white.jpg",
      additional: [
        "https://wildlife.nc.gov/sites/default/files/styles/640x480/public/2022-11/ParalicthysLethostigma.jpg?itok=SZmmXjEX",
        "https://upload.wikimedia.org/wikipedia/commons/8/80/Southern_flounder2.jpg"
      ]
    },
    description: "A flat, oval-shaped fish found throughout North Carolina's estuaries. Southern flounder are brown on their left side with numerous dark and light spots and blotches, but they are not ringed or ocellated as are other flounder species.",
    identification: "Southern flounder can be distinguished from other flounder species by the lack of ocellated spots. The right side of a southern flounder is white.",
    maxSize: "Up to 35 inches and 20 pounds",
    habitat: "Southern flounder are found in the oceans and estuarine waters along the Atlantic seaboard from Virginia to southeast Florida and in the Gulf of Mexico.",
    distribution: "Atlantic coast from North Carolina to Florida and throughout the Gulf of Mexico.",
    regulations: {
      sizeLimit: {
        min: 16,
        max: null,
        unit: 'in'
      },
      bagLimit: 1,
      openSeasons: [
        {
          from: "09-01",
          to: "09-30"
        }
      ],
      closedAreas: ["Some inland waters - check local regulations"],
      specialRegulations: ["Season and limits subject to change annually"]
    },
    conservationStatus: "Near Threatened",
    fishingTips: {
      techniques: ["Bottom fishing", "Gigging (at night)", "Drift fishing", "Casting jigs"],
      baits: ["Live finger mullet", "Live mud minnows", "Live shrimp", "Artificial jigs"],
      equipment: ["Medium action spinning rod", "15-20 lb test line", "2/0 to 3/0 circle hooks"],
      locations: ["Inlets", "Estuaries", "Marshes", "Nearshore structure", "Channels"]
    },
    categories: {
      type: ["Saltwater", "Brackish"],
      group: ["Flounder"]
    },
    seasons: {
      spring: false,
      summer: true,
      fall: true,
      winter: false,
    },
    similarSpecies: [
      {
        id: "10",
        name: "Summer Flounder",
        differentiatingFeatures: "Summer flounder has distinct ocellated spots (eye-like spots) on body"
      }
    ]
  },
  {
    id: "3",
    name: "Spotted Seatrout",
    commonNames: ["Speckled Trout", "Specks"],
    scientificName: "Cynoscion nebulosus",
    images: {
      primary: "https://www.bestfishinginamerica.com/wp-content/uploads/2022/08/spotted-seatrout-north-carolina-deq.jpg",
      additional: [
        "https://upload.wikimedia.org/wikipedia/commons/3/39/Cynoscion_nebulosus.jpg",
        "https://wildlife.nc.gov/sites/default/files/styles/640x480/public/2022-11/CynoscionNebulosus.jpg?itok=85XtdXSd"
      ]
    },
    description: "The Spotted Seatrout has a long, slender body with a dark bluish-silvery-gray back and silvery sides. Its body is marked by round, black spots on the back, upper sides, and extending into the second dorsal fin and the caudal fin.",
    identification: "Distinguished by the circular specks or spots on its body, dorsal fin, and caudal fin. The upper jaw has two large, curved, canine-like teeth.",
    maxSize: "Up to 36 inches and 12 pounds",
    habitat: "Spotted Seatrout use habitats throughout estuaries and occasionally the coastal ocean during different parts of their life history.",
    distribution: "Atlantic and Gulf coasts from Massachusetts to Mexico, most abundant from Chesapeake Bay to Florida.",
    regulations: {
      sizeLimit: {
        min: 14,
        max: null,
        unit: 'in'
      },
      bagLimit: 4,
      openSeasons: null,
      specialRegulations: ["Recreational fishing limits are 4 fish per person per day"]
    },
    conservationStatus: "Least Concern",
    fishingTips: {
      techniques: ["Light tackle casting", "Drift fishing", "Popping corks", "Artificial lures"],
      baits: ["Live shrimp", "Soft plastic jigs", "Mirrolures", "Topwater plugs"],
      equipment: ["6-7 ft medium action rod", "10-15 lb test line", "1/0 to 2/0 hooks"],
      locations: ["Grass flats", "Oyster bars", "Channel edges", "Creek mouths", "Docks"]
    },
    categories: {
      type: ["Saltwater", "Brackish"],
      group: ["Trout", "Drum"]
    },
    seasons: {
      spring: true,
      summer: true,
      fall: true,
      winter: true,
    },
    similarSpecies: [
      {
        id: "5",
        name: "Weakfish",
        differentiatingFeatures: "Weakfish has fewer spots and the spots don't extend onto the tail"
      }
    ]
  },
  {
    id: "4",
    name: "Striped Bass",
    commonNames: ["Rockfish", "Striper", "Rock"],
    scientificName: "Morone saxatilis",
    images: {
      primary: "https://files.nc.gov/deq/images/2021-10/Morone-saxatilis-white_1.jpg?VersionId=Vp_lJUYqENY8wy7SMIXdH_UBGzcQ9BUR",
      additional: [
        "https://upload.wikimedia.org/wikipedia/commons/2/2c/Striped_bass_lake_texoma.jpg",
        "https://www.ncwildlife.org/Portals/0/Fishing/documents/Morone-Saxatilis-Striped-Bass-Duane-Raver.jpg"
      ]
    },
    description: "Striped bass have a large mouth with a long body and head and slightly forked tail. Their color on top varies from a dark olive-green, to steel blue or gray black. Their sides are silver with seven or eight black, horizontal stripes, one of which follows the lateral line.",
    identification: "Distinguished by 7-8 horizontal black stripes along sides. They have one soft and one spiny dorsal fin, separated at the base.",
    maxSize: "Up to 60 inches and 125 pounds",
    habitat: "Striped bass are distributed along the Atlantic Coast from St. Lawrence River, Canada, to St. Johns River, Fla. They are anadromous and therefore found in both freshwater and saltwater.",
    distribution: "Atlantic coast from St. Lawrence to Florida. Introduced to freshwater reservoirs throughout North America.",
    regulations: {
      sizeLimit: {
        min: 18,
        max: null,
        unit: 'in'
      },
      bagLimit: 2,
      openSeasons: [
        {
          from: "10-01",
          to: "04-30"
        }
      ],
      closedAreas: ["Some inland waterways - check local regulations"],
      specialRegulations: ["Regulations vary by waterway and season"]
    },
    conservationStatus: "Least Concern",
    fishingTips: {
      techniques: ["Trolling", "Casting", "Jigging", "Live bait fishing", "Surf casting"],
      baits: ["Live eels", "Bunker", "Bucktails", "Soft plastics", "Topwater plugs"],
      equipment: ["Medium-heavy to heavy rod", "20-40 lb test line", "4/0 to 8/0 hooks"],
      locations: ["Inlets", "Bridges", "Nearshore ocean", "River mouths", "Deep holes"]
    },
    categories: {
      type: ["Saltwater", "Freshwater", "Brackish"],
      group: ["Bass"]
    },
    seasons: {
      spring: true,
      summer: false,
      fall: false,
      winter: true,
    }
  },
  {
    id: "5",
    name: "Weakfish",
    commonNames: ["Gray Trout", "Squeteague", "Sea Trout"],
    scientificName: "Cynoscion regalis",
    images: {
      primary: "https://files.nc.gov/deq/images/2021-10/Cynoscion-regalis.jpg?VersionId=M21mAoo1GcRJk2svXo61kFupvRsehkxR",
      additional: [
        "https://www.njfishandwildlife.com/images/fishing/fishid/marine/weakfish.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/5/5e/Weakfish.jpg"
      ]
    },
    description: "Weakfish are dark olive-green on top and silvery below, burnished on the back and sides with purple, lavender, green, blue, golden or copper. The sides are flecked with dark blotches that form wavy lines running down and forward, but not into the fins.",
    identification: "The fins are yellow, and there are two large canine-like teeth in the upper jaw. The spot pattern distinguishes weakfish from the spotted seatrout because the spots do not appear on the tail or second dorsal fins.",
    maxSize: "Up to 37 inches and 20 pounds",
    habitat: "Weakfish are found in coastal waters from Nova Scotia to northeast Florida but are more abundant between New York and North Carolina.",
    distribution: "Atlantic coast from Nova Scotia to Florida, most abundant from New York to North Carolina.",
    regulations: {
      sizeLimit: {
        min: 12,
        max: null,
        unit: 'in'
      },
      bagLimit: 1,
      openSeasons: null,
      specialRegulations: ["Limit of one fish per person per day"]
    },
    conservationStatus: "Near Threatened",
    fishingTips: {
      techniques: ["Bottom fishing", "Jigging", "Light tackle casting", "Drift fishing"],
      baits: ["Live minnows", "Cut bait", "Shrimp", "Bucktails", "Soft plastics"],
      equipment: ["Medium light spinning rod", "10-20 lb test line", "1/0 to 3/0 hooks"],
      locations: ["Inlets", "Channels", "Nearshore ocean", "Around structure"]
    },
    categories: {
      type: ["Saltwater"],
      group: ["Trout", "Drum"]
    },
    seasons: {
      spring: true,
      summer: true,
      fall: false,
      winter: false,
    }
  },
  {
    id: "6",
    name: "Cobia",
    commonNames: ["Black Salmon", "Ling", "Lemonfish"],
    scientificName: "Rachycentron canadum",
    images: {
      primary: "https://www.fisheries.noaa.gov/s3//styles/original/s3/2022-08/640x427-Cobia-NOAAFisheries.png?itok=ZbQQ_f85",
      additional: [
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKRQBbFH8V4Yvb2o7iGHmW9oKXDiBdXzAFTA&usqp=CAU",
        "https://upload.wikimedia.org/wikipedia/commons/2/2b/Rachycentron_canadum.jpg"
      ]
    },
    description: "Cobia are sleek, powerful fish with a broad, flat head and protruding lower jaw. Their coloration is dark brown to black on the upper sides, fading to a tan or brown-white on the lower sides and belly.",
    identification: "Distinguished by a dark lateral stripe extending from the eye to the tail. First dorsal fin consists of 7-9 short, stout, independent spines.",
    maxSize: "Up to 78 inches and 170 pounds",
    habitat: "Cobia are migratory fish found in inshore and offshore waters. They often congregate around structure such as wrecks, reefs, buoys, and navigational markers.",
    distribution: "Worldwide in tropical and subtropical waters. In North America, from Massachusetts to Mexico.",
    regulations: {
      sizeLimit: {
        min: 36,
        max: null,
        unit: 'in'
      },
      bagLimit: 1,
      openSeasons: [
        {
          from: "05-01",
          to: "09-30"
        }
      ],
      specialRegulations: ["Vessel limit: no more than 2 fish per vessel per day"]
    },
    conservationStatus: "Least Concern",
    fishingTips: {
      techniques: ["Sight casting", "Live baiting", "Jigging", "Trolling", "Chumming"],
      baits: ["Live eels", "Live crabs", "Large live minnows", "Bucktails", "Jigs"],
      equipment: ["Heavy action rod", "30-50 lb test line", "6/0 to 9/0 hooks"],
      locations: ["Buoys", "Wrecks", "Reefs", "Channel markers", "Manta rays"]
    },
    categories: {
      type: ["Saltwater"],
      group: ["Offshore"]
    },
    seasons: {
      spring: true,
      summer: true,
      fall: false,
      winter: false,
    }
  },
  {
    id: "7",
    name: "Bluegill",
    commonNames: ["Bream", "Brim", "Copper Nose"],
    scientificName: "Lepomis macrochirus",
    images: {
      primary: "https://www.wildlife.nh.gov/sites/g/files/ehbemt746/files/inline-images/bluegill-composite.jpg",
      additional: [
        "https://upload.wikimedia.org/wikipedia/commons/c/c5/Bluegill_Lepomis_macrochirus.jpg",
        "https://www.ncwildlife.org/Portals/0/Fishing/documents/Lepomis-macrochirus-Duane-Raver.jpg"
      ]
    },
    description: "Bluegill are small, colorful sunfish with a deep, compressed body and small mouth. They have a dark blue to purple-black opercular (ear) flap and a dark spot at the rear of the dorsal fin.",
    identification: "Distinguished by the dark blue opercular flap, dark spot on dorsal fin, and vertical bars on sides. Body is olive-green to brown on top with yellow-orange to copper on belly.",
    maxSize: "Up to 16 inches and 5 pounds, but typically much smaller",
    habitat: "Bluegill inhabit ponds, lakes, slow-moving streams, and reservoirs. They prefer areas with vegetation, woody debris, or other cover.",
    distribution: "Native to eastern and central United States, but widely introduced throughout North America.",
    regulations: {
      sizeLimit: {
        min: null,
        max: null,
        unit: 'in'
      },
      bagLimit: 30,
      openSeasons: null,
      specialRegulations: ["Mixed creel limit of 30 sunfish with no more than 12 redbreast sunfish"]
    },
    conservationStatus: "Least Concern",
    fishingTips: {
      techniques: ["Ultralight fishing", "Bobber fishing", "Fly fishing", "Ice fishing (winter)"],
      baits: ["Worms", "Crickets", "Small jigs", "Wet flies", "Poppers"],
      equipment: ["Ultralight rod", "2-6 lb test line", "Size 6-10 hooks"],
      locations: ["Near vegetation", "Around docks", "Near fallen trees", "Bridge pilings"]
    },
    categories: {
      type: ["Freshwater"],
      group: ["Panfish", "Sunfish"]
    },
    seasons: {
      spring: true,
      summer: true,
      fall: true,
      winter: true,
    }
  },
  {
    id: "8",
    name: "Largemouth Bass",
    commonNames: ["Black Bass", "Bucketmouth", "Green Bass"],
    scientificName: "Micropterus salmoides",
    images: {
      primary: "https://flms.net/wp-content/uploads/2024/07/fw-floridabass.png",
      additional: [
        "https://upload.wikimedia.org/wikipedia/commons/3/35/Large_mouth_bass.JPG",
        "https://www.ncwildlife.org/Portals/0/Fishing/documents/Micropterus-salmoides-Duane-Raver.jpg"
      ]
    },
    description: "Largemouth bass are olive-green to greenish-gray on their back and upper sides, with a whitish belly. A dark, sometimes black, lateral band extends from the eye to the tail.",
    identification: "Distinguished by the large mouth that extends beyond the eye when closed, and the dorsal fin which is nearly separated into two distinct fins. The upper jaw extends beyond the eye.",
    maxSize: "Up to 30 inches and 25 pounds",
    habitat: "Largemouth bass inhabit lakes, ponds, swamps, and slow-moving rivers. They prefer areas with cover such as vegetation, fallen trees, or rocks.",
    distribution: "Native to eastern and central United States, but widely introduced throughout North America and globally.",
    regulations: {
      sizeLimit: {
        min: 14,
        max: null,
        unit: 'in'
      },
      bagLimit: 5,
      openSeasons: null,
      specialRegulations: ["Some lakes and rivers have special regulations - check local rules"]
    },
    conservationStatus: "Least Concern",
    fishingTips: {
      techniques: ["Flipping and pitching", "Topwater fishing", "Soft plastic fishing", "Crankbait fishing"],
      baits: ["Plastic worms", "Jigs", "Spinnerbaits", "Crankbaits", "Live bait (shiners)"],
      equipment: ["Medium-heavy baitcasting rod", "12-20 lb test line", "3/0 to 5/0 hooks"],
      locations: ["Weed edges", "Docks", "Fallen trees", "Drop-offs", "Points"]
    },
    categories: {
      type: ["Freshwater"],
      group: ["Bass"]
    },
    seasons: {
      spring: true,
      summer: true,
      fall: true,
      winter: true,
    }
  }
];

export default fishSpeciesData;