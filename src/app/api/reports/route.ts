import { NextResponse } from 'next/server';

// This would be replaced by a DB call in production
const mockReports = [
  {
    _id: "test-westlands-incident",
    dateTime: new Date().toISOString(),
    coordinates: { type: "Point", coordinates: [36.8055, -1.2655] }, // Westlands, Nairobi
    type: "Phone theft",
    severity: 4,
    summary: "Phone theft at Westlands Shopping Centre - suspect on motorbike fled towards Parklands Road",
    location: "Westlands, Nairobi, Kenya",
    sourceType: "TEST"
  },
  {
    _id: "test-mombasa-incident",
    dateTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    coordinates: { type: "Point", coordinates: [39.6682, -4.0435] }, // Mombasa
    type: "Robbery",
    severity: 3,
    summary: "Armed robbery reported near Mombasa Old Town - three suspects fled on foot",
    location: "Old Town, Mombasa, Kenya",
    sourceType: "TEST"
  },
  {
    _id: "test-kisumu-incident", 
    dateTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    coordinates: { type: "Point", coordinates: [34.7617, -0.0917] }, // Kisumu
    type: "Vandalism",
    severity: 2,
    summary: "Shop windows broken during late night incident near Kisumu city center",
    location: "City Center, Kisumu, Kenya",
    sourceType: "TEST"
  },
  {
    _id: "test-nakuru-incident",
    dateTime: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    coordinates: { type: "Point", coordinates: [36.0667, -0.3031] }, // Nakuru
    type: "Car theft",
    severity: 5,
    summary: "Vehicle hijacking reported on Nakuru-Nairobi highway - victim unharmed",
    location: "Nakuru-Nairobi Highway, Nakuru, Kenya",
    sourceType: "TEST"
  },
  {
    _id: "test-eldoret-incident",
    dateTime: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    coordinates: { type: "Point", coordinates: [35.2699, 0.5143] }, // Eldoret
    type: "Burglary",
    severity: 3,
    summary: "Break-in at electronics shop in Eldoret town center - stock stolen",
    location: "Town Center, Eldoret, Kenya",
    sourceType: "TEST"
  },
  {
    _id: "689e3aa5c3edb447a775ce38",
    dateTime: "2025-08-14T19:36:05.217Z",
    coordinates: { type: "Point", coordinates: [18.6108323, -34.0465397] },
    type: "Violent Crimes",
    severity: 5,
    summary: "Over 20 shots were fired in the Caravelle side of Rocklands. Reports indicate that 1 or 2 people may have been shot. Further details are awaited.",
    sourceType: "COMMUNITY"
  },
  {
    _id: "689e348fc3edb447a775ce17",
    dateTime: "2025-08-14T19:10:07.845Z",
    coordinates: { type: "Point", coordinates: [18.61756027, -34.0547505] },
    type: "Violent Crimes",
    severity: 4,
    summary: "Gunshots were heard by various PNHW members in the area of Buckingham Way, Portland's Mitchell's Plain, Cape Town between 20:30 and 21:00. No further information available.",
    sourceType: "COMMUNITY"
  },
  {
    _id: "689a2115cb61e3d970fe7132",
    dateTime: "2025-08-11T16:57:57.485Z",
    coordinates: { type: "Point", coordinates: [18.848252199477, -33.902036584744] },
    type: "Violent Crimes",
    severity: 4,
    summary: "Shots were fired in Cloesville, Weltevrede.",
    sourceType: "COMMUNITY"
  },
  {
    _id: "68903cae3f590c255097daf0",
    dateTime: "2025-08-04T04:53:02.293Z",
    coordinates: { type: "Point", coordinates: [18.555770874023, -33.992649078369] },
    type: "Sexual Offences",
    severity: 4,
    summary: "An individual was touched without permission, causing distress.",
    sourceType: "COMMUNITY"
  },
  {
    _id: "688b1c7300932a2aedf4a799",
    dateTime: "2025-07-31T07:34:11.119Z",
    coordinates: { type: "Point", coordinates: [18.8322673, -33.9419784] },
    type: "Violent Crimes",
    severity: 4,
    summary: "A domestic worker was robbed in a park in Onder-Papegaaiberg. A Xhosa-speaking man in a navy hoodie robbed her of a black handbag containing her phone and wallet. He was armed with a knife and fled towards Flamingostraat cemetery.",
    sourceType: "COMMUNITY"
  },
  {
    _id: "6887548806aef063916f6932",
    dateTime: "2025-07-28T10:44:24.675Z",
    coordinates: { type: "Point", coordinates: [18.82645525, -33.99844254] },
    type: "Property & Financial Crimes",
    severity: 3,
    summary: "A group altercation occurred at a roadside stall on R44, leading to vehicle damage. The incident was instigated by an individual, and another person damaged vehicles with a stone.",
    sourceType: "COMMUNITY"
  }
];

export async function GET() {
  // For now, let's just return mock data to get the map working
  // We can add real event integration later
  
  // Return both real and mock events  
  return NextResponse.json({ 
    events: [], // Empty for now to avoid errors
    reports: mockReports, // Just use mock data for now
    reportCount: mockReports.length, 
    areaCount: 346 
  });
}
