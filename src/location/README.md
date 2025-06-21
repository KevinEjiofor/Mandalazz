# Location API Integration

This module provides integration with Google Places API for address autocomplete and location details during checkout, as well as Nigeria-specific location data.

## Features

- Address autocomplete suggestions based on user input
- Detailed place information including formatted address and coordinates
- Integration with checkout flow for easier location entry
- Nigeria states and Local Government Areas (LGAs) data

## API Endpoints

### Get Address Suggestions

```
GET /api/location/suggestions?query=<search_query>
```

**Parameters:**
- `query` (required): The search query for address suggestions (minimum 2 characters)

**Response:**
```json
{
  "success": true,
  "message": "Address suggestions retrieved successfully",
  "suggestions": [
    {
      "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "description": "123 Main St, City, Country"
    },
    {
      "placeId": "ChIJW-T2Wt7Gt4kRKl2I1CJFUsI",
      "description": "456 Oak Ave, Another City, Country"
    }
  ]
}
```

### Get Place Details

```
GET /api/location/details/:placeId
```

**Parameters:**
- `placeId` (required): The Google Places ID for the selected location

**Response:**
```json
{
  "success": true,
  "message": "Place details retrieved successfully",
  "place": {
    "address": "123 Main St, City, Country",
    "location": {
      "lat": 37.4224764,
      "lng": -122.0842499
    }
  }
}
```

### Get Nigerian States

```
GET /api/location/nigeria/states
```

**Parameters:**
- None

**Response:**
```json
{
  "success": true,
  "message": "Nigerian states retrieved successfully",
  "states": [
    "Abia",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Bayelsa",
    "Benue",
    "Borno",
    "Cross River",
    "Delta",
    "Ebonyi",
    "Edo",
    "Ekiti",
    "Enugu",
    "FCT - Abuja",
    "Gombe",
    "Imo",
    "Jigawa",
    "Kaduna",
    "Kano",
    "Katsina",
    "Kebbi",
    "Kogi",
    "Kwara",
    "Lagos",
    "Nasarawa",
    "Niger",
    "Ogun",
    "Ondo",
    "Osun",
    "Oyo",
    "Plateau",
    "Rivers",
    "Sokoto",
    "Taraba",
    "Yobe",
    "Zamfara"
  ]
}
```

### Get LGAs for a Nigerian State

```
GET /api/location/nigeria/states/:state/lgas
```

**Parameters:**
- `state` (required): The name of the Nigerian state (e.g., "Lagos", "FCT - Abuja")

**Response:**
```json
{
  "success": true,
  "message": "LGAs for Lagos retrieved successfully",
  "state": "Lagos",
  "lgas": [
    "Agege",
    "Ajeromi-Ifelodun",
    "Alimosho",
    "Amuwo-Odofin",
    "Apapa",
    "Badagry",
    "Epe",
    "Eti-Osa",
    "Ibeju-Lekki",
    "Ifako-Ijaiye",
    "Ikeja",
    "Ikorodu",
    "Kosofe",
    "Lagos Island",
    "Lagos Mainland",
    "Mushin",
    "Ojo",
    "Oshodi-Isolo",
    "Shomolu",
    "Surulere"
  ]
}
```

## Setup

1. Obtain a Google Places API key from the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Places API in your Google Cloud project
3. Add the API key to your `.env` file:

```
GOOGLE_PLACES_API_KEY=your_api_key_here
```

## Usage in Checkout

When creating a checkout, you can now include location data in the userDetails:

```json
{
  "userDetails": {
    "address": "123 Main St, City, Country",
    "location": {
      "lat": 37.4224764,
      "lng": -122.0842499,
      "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4"
    },
    "phoneNumber": "1234567890",
    "email": "user@example.com"
  },
  "paymentType": "payment_on_delivery"
}
```

The location data is optional but recommended for better user experience and future location-based features.
